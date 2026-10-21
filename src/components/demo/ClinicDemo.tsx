'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowLeft, Bell, CalendarCheck, Check, CreditCard, MessageCircle, Receipt, Stethoscope } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatSAR } from '@/lib/format'
import { trackEvent } from '@/lib/analytics'
import { whatsappLink } from '@/lib/whatsapp'
import { Button, buttonVariants } from '@/components/ui/button'
import { WhatsAppIcon } from '@/components/ui/icons'
import { TrackedAnchor, TrackedLink } from '@/components/ui/tracked-link'

/** Fictional clinic for the outreach demo (/demo/clinic). Nothing here talks to a server. */

type L = 'ar' | 'en'
const BRANCHES = ['malqa', 'yasmin'] as const
const DOCTORS = ['sara', 'fahad'] as const
const SERVICES = [
  { id: 'checkup', price: 150, minutes: 20 },
  { id: 'cleaning', price: 300, minutes: 45 },
  { id: 'filling', price: 450, minutes: 60 },
  { id: 'whitening', price: 1200, minutes: 60 },
] as const
type Branch = (typeof BRANCHES)[number]
type Doctor = (typeof DOCTORS)[number]
type Service = (typeof SERVICES)[number]['id']

const DEPOSIT = 100
const VAT_NO = '310000000000003'
const SLOTS = Array.from({ length: 12 }, (_, i) => 16 * 60 + i * 30) // 4:00 pm to 9:30 pm

type Appt = {
  id: string
  time: number
  patient: string // message key under data.patients, or the name typed in the demo
  typed?: boolean
  service: Service
  doctor: Doctor
  branch: Branch
  status: 'arrived' | 'confirmed' | 'new'
  deposit: boolean
  day?: string
  dayIdx?: number
}

const SEED: Appt[] = [
  {
    id: 's1',
    time: 960,
    patient: 'p1',
    service: 'checkup',
    doctor: 'sara',
    branch: 'malqa',
    status: 'arrived',
    deposit: true,
  },
  {
    id: 's2',
    time: 990,
    patient: 'p2',
    service: 'cleaning',
    doctor: 'fahad',
    branch: 'malqa',
    status: 'confirmed',
    deposit: true,
  },
  {
    id: 's3',
    time: 1050,
    patient: 'p3',
    service: 'whitening',
    doctor: 'sara',
    branch: 'yasmin',
    status: 'confirmed',
    deposit: true,
  },
  {
    id: 's4',
    time: 1080,
    patient: 'p4',
    service: 'filling',
    doctor: 'fahad',
    branch: 'yasmin',
    status: 'confirmed',
    deposit: false,
  },
  {
    id: 's5',
    time: 1140,
    patient: 'p5',
    service: 'cleaning',
    doctor: 'sara',
    branch: 'malqa',
    status: 'confirmed',
    deposit: true,
  },
]

type Event = { id: number; kind: 'booked' | 'paid' | 'whatsapp' | 'invoice'; at: number }

const intlLocale = (l: L) => (l === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US')

function formatTime(minutes: number, locale: L) {
  return new Intl.DateTimeFormat(intlLocale(locale), { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2026, 0, 1, Math.floor(minutes / 60), minutes % 60)),
  )
}

const money2 = (n: number, locale: L) =>
  new Intl.NumberFormat(intlLocale(locale), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

/** Today in Riyadh as YYYY-MM-DD. Client-only, so the cached HTML never shows a stale date. */
const riyadhToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date())
const noSubscribe = () => () => {}

/** Six working days from `today`, skipping Fridays. Dates are UTC midnights. */
function workingDays(today: string) {
  const [y, m, d] = today.split('-').map(Number)
  const days: Date[] = []
  for (let i = 0; days.length < 6; i++) {
    const day = new Date(Date.UTC(y, m - 1, d + i))
    if (day.getUTCDay() !== 5) days.push(day)
  }
  return days
}

/** Deterministic "already booked" slots so the grid looks lived-in. */
const isTaken = (dayIdx: number, doctor: Doctor, slot: number) =>
  (dayIdx * 7 + (doctor === 'sara' ? 3 : 5) + slot / 30) % 3 === 0

/** Analytics never blocks the demo; trackEvent itself respects cookie consent. */
function safeTrack(name: string, params: Record<string, unknown>) {
  try {
    trackEvent(name, { page: window.location.pathname, demo: 'clinic', ...params })
  } catch {
    /* ignore */
  }
}

export function ClinicDemo({
  scorecardHref = '/scorecard?from=%2Fdemo%2Fclinic',
  whatsappNumber,
  whatsappMessage,
  refCode = 'DEMO-CLINIC',
}: {
  scorecardHref?: string
  whatsappNumber?: string | null
  whatsappMessage?: string
  refCode?: string
} = {}) {
  const locale = useLocale() as L
  const t = useTranslations('demo')
  const todayKey = useSyncExternalStore(noSubscribe, riyadhToday, () => null)
  const days = useMemo(() => (todayKey ? workingDays(todayKey) : []), [todayKey])
  const [step, setStep] = useState(1)
  const [branch, setBranch] = useState<Branch>('malqa')
  const [service, setService] = useState<Service>('checkup')
  const [doctor, setDoctor] = useState<Doctor>('sara')
  const [dayIdx, setDayIdx] = useState(0)
  const [slot, setSlot] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [touched, setTouched] = useState(false)
  const [paying, setPaying] = useState(false)
  const [appts, setAppts] = useState<Appt[]>(SEED)
  const [events, setEvents] = useState<Event[]>([])
  const [invoice, setInvoice] = useState<{ number: string; service: Service } | null>(null)
  const [filter, setFilter] = useState<Branch | 'all'>('all')
  const [fresh, setFresh] = useState<string | null>(null)
  const dashboardRef = useRef<HTMLDivElement>(null)
  const timers = useRef<number[]>([])
  const started = useRef(false)

  /** First step forward = the visitor is actually trying the demo (fires once per page view). */
  function start() {
    if (!started.current) {
      started.current = true
      safeTrack('demo_start', {})
    }
    setStep(2)
  }

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  const dayLabel = (d: Date, opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }) =>
    new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', {
      ...opts,
      timeZone: 'UTC',
    }).format(d)
  const patientName = (a: Appt) => (a.typed ? a.patient : t(`data.patients.${a.patient}`))
  const svc = SERVICES.find((s) => s.id === service)!

  const nameOk = name.trim().length >= 2
  const phoneOk = /^05\d{8}$/.test(phone.replace(/\s/g, ''))

  function pay() {
    setPaying(true)
    timers.current.push(
      window.setTimeout(() => {
        const id = `n${Date.now()}`
        const number = `INV-${new Date().getFullYear()}-${String(1000 + appts.length + 1).padStart(5, '0')}`
        const appt: Appt = {
          id,
          time: slot!,
          patient: name.trim(),
          typed: true,
          service,
          doctor,
          branch,
          status: 'new',
          deposit: true,
          dayIdx,
          day: dayIdx === 0 ? undefined : dayLabel(days[dayIdx], { weekday: 'short', day: 'numeric', month: 'short' }),
        }
        setPaying(false)
        setStep(5)
        safeTrack('demo_complete', { service })
        setAppts((a) => [...a, appt])
        setFresh(id)
        setInvoice({ number, service })
        // Stagger the activity feed so the dashboard visibly reacts.
        ;(['booked', 'paid', 'whatsapp', 'invoice'] as const).forEach((kind, i) =>
          timers.current.push(
            window.setTimeout(
              () => setEvents((e) => [{ id: Date.now() + i, kind, at: Date.now() }, ...e]),
              300 + i * 450,
            ),
          ),
        )
      }, 1100),
    )
  }

  function reset() {
    setStep(1)
    setSlot(null)
    setName('')
    setPhone('')
    setTouched(false)
  }

  const today = appts.filter((a) => !a.day && (filter === 'all' || a.branch === filter)).sort((a, b) => a.time - b.time)
  const later = appts.filter((a) => a.day && (filter === 'all' || a.branch === filter))
  const depositsToday = today.filter((a) => a.deposit).length * DEPOSIT
  const lastNew = [...appts].reverse().find((a) => a.typed)
  const waDigits = (whatsappNumber || '').replace(/[^\d]/g, '')
  const waHref = waDigits
    ? whatsappLink({ number: waDigits, message: whatsappMessage || t('cta.whatsapp'), ref: refCode })
    : null

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[380px_1fr] lg:gap-12">
      {/* Patient phone */}
      <div>
        <p className="mb-4 text-sm font-semibold text-ink-600">{t('patientView')}</p>
        <div className="mx-auto w-full max-w-[380px] rounded-[2.5rem] border-[10px] border-ink-950 bg-white shadow-xl">
          <div className="flex items-center gap-3 rounded-t-[1.9rem] bg-ink-950 px-5 pt-3 pb-4 text-sand-50">
            <span
              className="grid size-9 place-items-center rounded-full bg-ignition-500 font-bold text-ink-950"
              aria-hidden="true"
            >
              {t('clinic.short').charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{t('clinic.name')}</p>
              {step <= 4 ? <p className="text-xs text-sand-300">{t('booking.stepOf', { step })}</p> : null}
            </div>
          </div>

          <div className="h-[600px] overflow-y-auto px-5 py-5" aria-live="polite">
            {step === 1 && (
              <div className="flex flex-col gap-6">
                <fieldset>
                  <legend className="mb-3 font-bold">{t('booking.branch')}</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {BRANCHES.map((b) => (
                      <Choice key={b} selected={branch === b} onClick={() => setBranch(b)}>
                        {t(`data.branches.${b}`)}
                      </Choice>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="mb-3 font-bold">{t('booking.service')}</legend>
                  <div className="flex flex-col gap-2">
                    {SERVICES.map((s) => (
                      <Choice
                        key={s.id}
                        selected={service === s.id}
                        onClick={() => setService(s.id)}
                        className="justify-between text-start"
                      >
                        <span>
                          <span className="block font-semibold">{t(`data.services.${s.id}`)}</span>
                          <span className="text-sm text-ink-600">{t('booking.minutes', { n: s.minutes })}</span>
                        </span>
                        <bdi className="num text-sm">{formatSAR(s.price, locale)}</bdi>
                      </Choice>
                    ))}
                  </div>
                </fieldset>
                <Button block onClick={start}>
                  {t('booking.next')}
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-6">
                <BackButton onClick={() => setStep(1)} label={t('booking.back')} />
                <fieldset>
                  <legend className="mb-3 font-bold">{t('booking.doctor')}</legend>
                  <div className="flex flex-col gap-2">
                    {DOCTORS.map((d) => (
                      <Choice
                        key={d}
                        selected={doctor === d}
                        onClick={() => {
                          setDoctor(d)
                          setSlot(null)
                        }}
                        className="text-start"
                      >
                        <Stethoscope className="size-5 shrink-0 text-ignition-700" aria-hidden="true" />
                        <span>
                          <span className="block font-semibold">{t(`data.doctors.${d}`)}</span>
                          <span className="text-sm text-ink-600">{t(`data.specialties.${d}`)}</span>
                        </span>
                      </Choice>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="mb-1 font-bold">{t('booking.day')}</legend>
                  <p className="mb-3 text-xs text-ink-600">{t('booking.closedFriday')}</p>
                  <div className="relative -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    {days.map((d, i) => (
                      <Choice
                        key={d.toISOString()}
                        selected={dayIdx === i}
                        onClick={() => {
                          setDayIdx(i)
                          setSlot(null)
                        }}
                        className="min-w-16 flex-col gap-0 px-2 py-2"
                      >
                        <span className="text-xs">
                          {i === 0 ? t('booking.today') : dayLabel(d, { weekday: 'short' })}
                        </span>
                        <span className="num text-lg font-bold">{dayLabel(d, { day: 'numeric' })}</span>
                      </Choice>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="mb-3 font-bold">{t('booking.time')}</legend>
                  <div className="grid grid-cols-3 gap-2">
                    {SLOTS.map((s) => {
                      const taken =
                        isTaken(dayIdx, doctor, s) ||
                        appts.some((a) => a.doctor === doctor && a.time === s && (a.dayIdx ?? 0) === dayIdx)
                      return (
                        <button
                          key={s}
                          type="button"
                          disabled={taken}
                          onClick={() => setSlot(s)}
                          aria-pressed={slot === s}
                          className={cn(
                            'num min-h-11 rounded-lg border text-sm transition-colors',
                            taken && 'cursor-not-allowed border-sand-100 bg-sand-100 text-stone-500 line-through',
                            !taken && slot !== s && 'border-sand-300 hover:border-ink-950',
                            slot === s && 'border-ink-950 bg-ink-950 text-sand-50',
                          )}
                        >
                          {formatTime(s, locale)}
                        </button>
                      )
                    })}
                  </div>
                </fieldset>
                <Button block disabled={slot === null} onClick={() => setStep(3)}>
                  {t('booking.next')}
                </Button>
              </div>
            )}

            {step === 3 && (
              <form
                className="flex flex-col gap-5"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault()
                  setTouched(true)
                  if (nameOk && phoneOk) setStep(4)
                }}
              >
                <BackButton onClick={() => setStep(2)} label={t('booking.back')} />
                <h3 className="font-bold">{t('booking.details')}</h3>
                <Field
                  id="demo-name"
                  label={t('booking.name')}
                  value={name}
                  onChange={setName}
                  placeholder={t('booking.namePlaceholder')}
                  error={touched && !nameOk ? t('booking.nameError') : undefined}
                  autoComplete="name"
                />
                <Field
                  id="demo-phone"
                  label={t('booking.phone')}
                  value={phone}
                  onChange={setPhone}
                  placeholder={t('booking.phonePlaceholder')}
                  error={touched && !phoneOk ? t('booking.phoneError') : undefined}
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                />
                <Summary
                  rows={[
                    [t('data.services.' + service), formatSAR(svc.price, locale)],
                    [t(`data.doctors.${doctor}`), t(`data.branches.${branch}`)],
                    [days[dayIdx] ? dayLabel(days[dayIdx]) : '', slot !== null ? formatTime(slot, locale) : ''],
                  ]}
                  title={t('booking.summary')}
                />
                <Button block type="submit">
                  {t('booking.next')}
                </Button>
              </form>
            )}

            {step === 4 && (
              <div className="flex flex-col gap-5">
                <BackButton onClick={() => setStep(3)} label={t('booking.back')} />
                <div className="rounded-card bg-sand-100 p-5">
                  <p className="text-sm text-ink-600">{t('booking.deposit')}</p>
                  <p className="num mt-1 text-3xl font-bold">{formatSAR(DEPOSIT, locale)}</p>
                  <p className="mt-3 text-sm text-ink-600">{t('booking.depositNote')}</p>
                </div>
                <Button block onClick={pay} disabled={paying} className="bg-ink-950 text-sand-50 hover:bg-ink-800">
                  <CreditCard className="size-5" aria-hidden="true" />
                  {paying ? t('booking.paying') : t('booking.payMada', { amount: formatSAR(DEPOSIT, locale) })}
                </Button>
                <Button block variant="secondary" onClick={pay} disabled={paying}>
                  {t('booking.payApple')}
                </Button>
                <p className="text-center text-xs text-stone-500">{t('booking.demoPay')}</p>
              </div>
            )}

            {step === 5 && lastNew && (
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-verified-600 text-white">
                    <Check className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="text-lg font-bold">{t('booking.doneTitle')}</h3>
                </div>
                <p className="text-sm text-ink-600">{t('booking.doneLead')}</p>
                <div className="rounded-2xl bg-[#e7fbe0] p-4 text-sm leading-relaxed">
                  {t('booking.waConfirm', {
                    name: lastNew.patient,
                    clinic: t('clinic.name'),
                    branch: t(`data.branches.${lastNew.branch}`),
                    day: days[dayIdx] ? dayLabel(days[dayIdx]) : '',
                    time: formatTime(lastNew.time, locale),
                    doctor: t(`data.doctors.${lastNew.doctor}`),
                    amount: formatSAR(DEPOSIT, locale),
                  })}
                </div>
                <div>
                  <div className="rounded-2xl bg-[#e7fbe0] p-4 text-sm leading-relaxed opacity-80">
                    {t('booking.waReminder', { clinic: t('clinic.name'), time: formatTime(lastNew.time, locale) })}
                  </div>
                  <p className="mt-2 flex items-center gap-1 text-xs text-stone-500">
                    <Bell className="size-3.5" aria-hidden="true" />
                    {t('booking.waReminderNote')}
                  </p>
                </div>
                <Button
                  block
                  variant="secondary"
                  className="lg:hidden"
                  onClick={() => dashboardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  {t('booking.seeClinic')}
                </Button>
                <DemoCta
                  title={t('endCta.patient')}
                  placement="demo_confirmation"
                  scorecardHref={scorecardHref}
                  scorecardLabel={t('endCta.scorecard')}
                  whatsappHref={waHref}
                  whatsappLabel={t('endCta.whatsapp')}
                  refCode={refCode}
                />
                <Button block variant="ghost" onClick={reset}>
                  {t('booking.again')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clinic dashboard */}
      <div ref={dashboardRef} className="scroll-mt-24">
        <p className="mb-4 text-sm font-semibold text-ink-600">{t('clinicView')}</p>
        <div className="overflow-hidden rounded-card border border-sand-300 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand-300 bg-sand-100 px-5 py-4">
            <div>
              <p className="font-bold">{t('clinic.name')}</p>
              <p className="text-sm text-ink-600">{days[0] ? dayLabel(days[0]) : ' '}</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-ink-600">{t('dashboard.branchFilter')}</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as Branch | 'all')}
                className="min-h-10 rounded-lg border border-sand-300 bg-white px-3"
              >
                <option value="all">{t('dashboard.allBranches')}</option>
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {t(`data.branches.${b}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-3 border-b border-sand-300">
            <Kpi icon={CalendarCheck} label={t('dashboard.todayAppointments')} value={String(today.length)} />
            <Kpi icon={CreditCard} label={t('dashboard.deposits')} value={formatSAR(depositsToday, locale)} />
            <Kpi icon={MessageCircle} label={t('dashboard.reminders')} value={String(today.length + later.length)} />
          </div>

          <div className="grid gap-0 xl:grid-cols-[1fr_300px]">
            <div className="p-5">
              <h3 className="mb-3 font-bold">{t('dashboard.schedule')}</h3>
              {today.length === 0 ? (
                <p className="text-sm text-ink-600">{t('dashboard.empty')}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {today.map((a) => (
                    <ApptRow key={a.id} a={a} fresh={fresh === a.id} name={patientName(a)} locale={locale} />
                  ))}
                </ul>
              )}
              {later.length > 0 && (
                <>
                  <h3 className="mt-6 mb-3 font-bold">{t('dashboard.upcoming')}</h3>
                  <ul className="flex flex-col gap-2">
                    {later.map((a) => (
                      <ApptRow key={a.id} a={a} fresh={fresh === a.id} name={patientName(a)} locale={locale} />
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="flex flex-col gap-5 border-t border-sand-300 p-5 xl:border-t-0 xl:border-s">
              <div>
                <h3 className="mb-3 font-bold">{t('dashboard.activity')}</h3>
                {events.length === 0 ? (
                  <p className="text-sm text-ink-600">{t('dashboard.activityEmpty')}</p>
                ) : (
                  <ul className="flex flex-col gap-2 text-sm" aria-live="polite">
                    {events.map((e) => (
                      <li
                        key={e.id}
                        className="flex gap-2 rounded-lg bg-sand-50 p-2 motion-safe:animate-[demo-in_300ms_ease-out]"
                      >
                        <span className="mt-1 size-2 shrink-0 rounded-full bg-verified-600" aria-hidden="true" />
                        <span>
                          {t(`dashboard.events.${e.kind}`, {
                            patient: lastNew?.patient ?? '',
                            service: invoice ? t(`data.services.${invoice.service}`) : '',
                            amount: formatSAR(DEPOSIT, locale),
                            number: invoice?.number ?? '',
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {invoice && events.some((e) => e.kind === 'invoice') && (
                <Invoice
                  number={invoice.number}
                  service={t(`data.services.${invoice.service}`)}
                  locale={locale}
                  t={(k, v) => t(`dashboard.invoice.${k}`, v)}
                  clinic={t('clinic.name')}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      {/* After the dashboard: the same next step, framed for the clinic owner. */}
      <div className="lg:col-start-2">
        <DemoCta
          title={t('endCta.clinic')}
          placement="demo_dashboard"
          scorecardHref={scorecardHref}
          scorecardLabel={t('endCta.scorecard')}
          whatsappHref={waHref}
          whatsappLabel={t('endCta.whatsapp')}
          refCode={refCode}
          wide
        />
      </div>
      <style>{'@keyframes demo-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}'}</style>
    </div>
  )
}

/** Scorecard (primary) + WhatsApp (secondary), shown where the demo has made its point. */
function DemoCta({
  title,
  placement,
  scorecardHref,
  scorecardLabel,
  whatsappHref,
  whatsappLabel,
  refCode,
  wide = false,
}: {
  title: string
  placement: string
  scorecardHref: string
  scorecardLabel: string
  whatsappHref: string | null
  whatsappLabel: string
  refCode: string
  wide?: boolean
}) {
  return (
    <div className={cn('rounded-card bg-ink-950 text-sand-50', wide ? 'p-6 lg:p-8' : 'p-5')} data-tone="dark">
      <p className={cn('font-bold', wide ? 'text-xl' : 'text-base')}>{title}</p>
      <div className={cn('mt-4 flex flex-col gap-2', wide && 'sm:flex-row')}>
        <TrackedLink
          href={scorecardHref}
          event="cta_click"
          params={{ cta_id: 'demo_scorecard', location: placement, ref_code: refCode }}
          className={buttonVariants({ variant: 'primary', block: !wide })}
        >
          {scorecardLabel}
        </TrackedLink>
        {whatsappHref ? (
          <TrackedAnchor
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            event="whatsapp_click"
            params={{ location: placement, ref_code: refCode }}
            className={buttonVariants({ variant: 'secondary-dark', block: !wide })}
          >
            <WhatsAppIcon />
            {whatsappLabel}
          </TrackedAnchor>
        ) : null}
      </div>
    </div>
  )
}

function ApptRow({ a, fresh, name, locale }: { a: Appt; fresh: boolean; name: string; locale: L }) {
  const t = useTranslations('demo')
  return (
    <li
      className={cn(
        'flex gap-3 rounded-lg border p-3 text-sm',
        fresh ? 'border-ignition-500 bg-[#fff3ec] motion-safe:animate-[demo-in_300ms_ease-out]' : 'border-sand-300',
      )}
    >
      <span className="w-16 shrink-0">
        {a.day ? <span className="block text-xs text-ink-600">{a.day}</span> : null}
        <span className="num font-semibold">{formatTime(a.time, locale)}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="font-semibold">{name}</span>
          <span
            className={cn(
              'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold',
              a.status === 'new' && 'bg-ignition-500 text-ink-950',
              a.status === 'arrived' && 'bg-verified-600 text-white',
              a.status === 'confirmed' && 'bg-sand-100 text-ink-800',
            )}
          >
            {t(`dashboard.status.${a.status}`)}
          </span>
        </span>
        <span className="block text-ink-600">
          {t(`data.services.${a.service}`)} · {t(`data.doctors.${a.doctor}`)}
        </span>
        <span className="mt-1 flex flex-wrap gap-x-3 text-xs">
          <span className="text-ink-600">{t(`data.branches.${a.branch}`)}</span>
          {a.deposit && <span className="text-verified-600">{t('dashboard.depositPaid')}</span>}
        </span>
      </span>
    </li>
  )
}

function Choice({
  selected,
  onClick,
  className,
  children,
}: {
  selected: boolean
  onClick: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex min-h-11 items-center justify-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors',
        selected ? 'border-ink-950 bg-sand-100 ring-1 ring-ink-950' : 'border-sand-300 hover:border-ink-950',
        className,
      )}
    >
      {children}
    </button>
  )
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-10 items-center gap-1 self-start text-sm text-ink-600 hover:text-ink-950"
    >
      <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
      {label}
    </button>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  ...rest
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'id'>) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn('min-h-12 w-full rounded-lg border px-3', error ? 'border-ignition-700' : 'border-sand-300')}
        {...rest}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-ignition-700">
          {error}
        </p>
      )}
    </div>
  )
}

function Summary({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-lg bg-sand-100 p-4 text-sm">
      <p className="mb-2 font-semibold">{title}</p>
      <dl className="flex flex-col gap-1">
        {rows.map(([a, b]) => (
          <div key={a} className="flex justify-between gap-3">
            <dt>{a}</dt>
            <dd className="num">{b}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function Kpi({ icon: Icon, label, value }: { icon: typeof CalendarCheck; label: string; value: string }) {
  return (
    <div className="border-s border-sand-300 p-4 first:border-s-0">
      <Icon className="size-4 text-ignition-700" aria-hidden="true" />
      <p className="num mt-2 text-xl font-bold sm:text-2xl">{value}</p>
      <p className="text-xs text-ink-600">{label}</p>
    </div>
  )
}

function Invoice({
  number,
  service,
  clinic,
  locale,
  t,
}: {
  number: string
  service: string
  clinic: string
  locale: L
  t: (key: string, values?: Record<string, string>) => string
}) {
  const subtotal = DEPOSIT / 1.15
  return (
    <div className="rounded-lg border border-sand-300 p-4 text-sm motion-safe:animate-[demo-in_300ms_ease-out]">
      <div className="flex items-center gap-2">
        <Receipt className="size-4 text-ignition-700" aria-hidden="true" />
        <p className="font-bold">{t('title')}</p>
      </div>
      <p className="mt-2 font-semibold">{clinic}</p>
      <dl className="mt-2 flex flex-col gap-1 text-ink-600">
        <Row k={t('number')} v={number} />
        <Row k={t('vatNo')} v={VAT_NO} />
      </dl>
      <p className="mt-3 border-t border-sand-300 pt-3">{t('item', { service })}</p>
      <dl className="mt-2 flex flex-col gap-1">
        <Row k={t('subtotal')} v={money2(subtotal, locale)} />
        <Row k={t('vat')} v={money2(DEPOSIT - subtotal, locale)} />
        <Row k={t('total')} v={formatSAR(DEPOSIT, locale)} strong />
      </dl>
      <div className="mt-4 flex items-center gap-3">
        <FakeQr />
        <p className="text-xs text-stone-500">{t('qr')}</p>
      </div>
    </div>
  )
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={cn('flex justify-between gap-3', strong && 'font-bold text-ink-950')}>
      <dt>{k}</dt>
      <dd className="num">{v}</dd>
    </div>
  )
}

/** Decorative QR-like pattern; a real build encodes the ZATCA TLV payload. */
function FakeQr() {
  const n = 21
  const cells: [number, number][] = []
  const finder = (x: number, y: number) => {
    const fx = x < 7 ? x : x >= n - 7 ? x - (n - 7) : -1
    const fy = y < 7 ? y : y >= n - 7 ? y - (n - 7) : -1
    if (fx < 0 || fy < 0 || (x >= n - 7 && y >= n - 7)) return null
    return fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4)
  }
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const f = finder(x, y)
      if (f === null ? (x * 31 + y * 17 + x * y) % 3 === 0 : f) cells.push([x, y])
    }
  return (
    <svg viewBox={`0 0 ${n} ${n}`} className="size-16 shrink-0" aria-hidden="true">
      <rect width={n} height={n} fill="white" />
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#0b0f14" />
      ))}
    </svg>
  )
}
