import { getTranslations } from 'next-intl/server'
import { CalendarCheck, CheckCircle2, CreditCard, FileText } from 'lucide-react'
import { Trajectory } from '@/components/ui/trajectory'

/**
 * Decorative product illustration built with HTML/CSS: neutral UI shapes and labels, no figures
 * (nothing that could read as a real metric). Animates transform/opacity only; static under
 * reduced motion. The Day 1 → Day 30 trajectory sits underneath.
 */
export async function ProductMockup({ locale }: { locale: 'ar' | 'en' }) {
  const t = await getTranslations({ locale, namespace: 'home' })
  const nav = t.raw('hero.mockup.nav') as string[]

  return (
    <div className="relative">
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .etq-float { animation: etq-float 6s ease-in-out infinite; }
          .etq-rise { opacity: 0; transform: translateY(12px); animation: etq-rise .6s cubic-bezier(.22,.61,.36,1) forwards; }
          .etq-pulse { animation: etq-pulse 2.4s ease-in-out infinite; }
        }
        @keyframes etq-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        @keyframes etq-rise { to { opacity: 1; transform: translateY(0) } }
        @keyframes etq-pulse { 0%,100% { opacity: 1 } 50% { opacity: .35 } }
      `}</style>

      <figure aria-label={t('hero.mockup.label')} className="m-0">
        <div className="etq-float overflow-hidden rounded-card border border-sand-300 bg-white shadow-[0_24px_60px_-30px_rgba(11,15,20,.35)]">
          {/* Window bar */}
          <div className="flex items-center justify-between border-b border-sand-300 bg-sand-100 px-4 py-3">
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="size-2.5 rounded-full bg-sand-300" />
              <span className="size-2.5 rounded-full bg-sand-300" />
              <span className="size-2.5 rounded-full bg-sand-300" />
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-verified-600">
              <span className="etq-pulse size-2 rounded-full bg-verified-600" aria-hidden="true" />
              {t('hero.mockup.status')}
            </span>
          </div>

          <div className="grid grid-cols-[7.5rem_1fr] sm:grid-cols-[9rem_1fr]">
            {/* Sidebar */}
            <div className="border-e border-sand-300 bg-sand-50 p-3">
              <p className="mb-3 font-display text-sm font-bold">{t('hero.mockup.appName')}</p>
              <ul className="flex flex-col gap-1 text-xs text-ink-600">
                {nav.map((item, i) => (
                  <li key={item} className={i === 0 ? 'rounded-md bg-ink-950 px-2 py-1.5 font-semibold text-sand-50' : 'px-2 py-1.5'}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-3 p-4">
              <MockCard delay="0.2s" icon={<CalendarCheck className="size-4" />} title={t('hero.mockup.cardBookings')}>
                <div className="flex flex-col gap-1.5" aria-hidden="true">
                  {[85, 65, 75].map((w, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="size-5 shrink-0 rounded-full bg-sand-100" />
                      <span className="h-2 rounded-full bg-sand-300" style={{ width: `${w}%` }} />
                    </div>
                  ))}
                </div>
              </MockCard>
              <MockCard delay="0.5s" icon={<CreditCard className="size-4" />} title={t('hero.mockup.cardPayments')}>
                <div className="flex items-end gap-1.5" aria-hidden="true">
                  {[30, 45, 40, 60, 55, 75, 90].map((h, i) => (
                    <span key={i} className="w-full rounded-t bg-ignition-500/80" style={{ height: `${h * 0.5}px` }} />
                  ))}
                </div>
              </MockCard>
              <MockCard delay="0.8s" icon={<FileText className="size-4" />} title={t('hero.mockup.cardInvoice')}>
                <div className="flex items-center justify-between gap-3" aria-hidden="true">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <span className="h-2 w-3/4 rounded-full bg-sand-300" />
                    <span className="h-2 w-1/2 rounded-full bg-sand-300" />
                  </div>
                  {/* QR-like block */}
                  <span className="grid size-9 grid-cols-3 gap-0.5 rounded bg-white p-0.5 ring-1 ring-sand-300">
                    {Array.from({ length: 9 }, (_, i) => (
                      <span key={i} className={[0, 2, 4, 6, 8].includes(i) ? 'bg-ink-950' : 'bg-sand-100'} />
                    ))}
                  </span>
                  <CheckCircle2 className="size-5 text-verified-600" />
                </div>
              </MockCard>
            </div>
          </div>
        </div>

        {/* Day 1 → Day 30 */}
        <figcaption className="mt-6">
          <p className="sr-only">{t('hero.trajectory.label')}</p>
          <Trajectory className="h-20" />
          <ol className="mt-2 grid grid-cols-3 gap-2 text-xs sm:text-sm">
            {(['day1', 'day10', 'day30'] as const).map((d, i) => (
              <li key={d} className={i === 1 ? 'text-center' : i === 2 ? 'text-end' : 'text-start'}>
                <span className="block font-display font-bold">{t(`hero.trajectory.${d}`)}</span>
                <span className="text-ink-600">{t(`hero.trajectory.${d}Text`)}</span>
              </li>
            ))}
          </ol>
        </figcaption>
      </figure>
    </div>
  )
}

function MockCard({ title, icon, delay, children }: { title: string; icon: React.ReactNode; delay: string; children: React.ReactNode }) {
  return (
    <div className="etq-rise rounded-xl border border-sand-300 bg-white p-3" style={{ animationDelay: delay }}>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-950">
        <span className="text-ignition-700" aria-hidden="true">
          {icon}
        </span>
        {title}
      </p>
      {children}
    </div>
  )
}
