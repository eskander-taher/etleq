'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from '@/i18n/navigation'
import { trackEvent } from '@/lib/analytics'
import { layers, pick } from './content'
import './scan-story.css'

/** The app the visitor recognises: the top plate of the stack in the hero and in the X-ray. */
export function AppFace({ locale }: { locale: string }) {
  const t = (en: string, ar: string) => pick(locale, [en, ar])
  return (
    <div className="scan-app">
      <div className="scan-app-bar">
        <i />
        {t('Your customer portal', 'بوابة عملائك')}
      </div>
      <div className="scan-app-tiles">
        <div>
          <small>{t('Orders', 'الطلبات')}</small>
          <b>24</b>
        </div>
        <div>
          <small>{t('Customers', 'العملاء')}</small>
          <b>128</b>
        </div>
      </div>
      <div className="scan-app-chart">
        {[30, 45, 38, 60, 52, 74, 68, 90].map((h, k) => (
          <i key={k} style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="scan-app-button">{t('Pay now', 'ادفع الآن')}</div>
    </div>
  )
}

/** Illustrative only: the same two risks as the sample report (layer 03 warning, layer 04 critical). */
const risk: Record<number, 'warn' | 'critical'> = { 2: 'warn', 3: 'critical' }

const clamp = (v: number) => Math.min(1, Math.max(0, v))
const ease = (v: number) => v * v * (3 - 2 * v)
const range = (p: number, from: number, to: number) => ease(clamp((p - from) / (to - from)))
/** Time-based smoothing: the story glides toward the scroll position at the same speed at 60Hz or 120Hz. */
const SMOOTHING_MS = 110

/** Story timeline, as fractions of the section's scroll. */
const T = {
  beam: [0.3, 0.66],
  gather: [0.66, 0.74],
  handoff: 0.75,
  fade: [0.745, 0.79],
  paper: [0.755, 0.85],
  done: [0.86, 0.91],
  stamp: 0.93,
} as const
/** Each flagged piece flies into its report row: critical first, then warning, then the 13 that pass. */
const FLIGHTS = [
  { layer: 3, row: 0, from: 0.755, to: 0.835 },
  { layer: 2, row: 1, from: 0.77, to: 0.85 },
  { layer: 7, row: 2, from: 0.785, to: 0.865 },
] as const

type Box = { x: number; y: number; w: number; h: number }

/**
 * Scroll drives a timeline; the drawn frame eases toward it, so wheel steps and flicks become glides.
 * Per-layer colour, glow and pop are computed in CSS from continuous variables, so nothing snaps,
 * and React re-renders only when a number in the copy changes.
 *
 * The hand-off from 15 layers to the report is one movement: the 13 passing layers close into a block,
 * the 2 flagged layers float free, then each piece flies (as a flat chip) into its own report row.
 * Chip start and end positions are measured once per resize, never inside the animation frame.
 */
export function ScanStory({ locale }: { locale: string }) {
  const t = (en: string, ar: string) => pick(locale, [en, ar])
  const root = useRef<HTMLElement>(null)
  const [scanned, setScanned] = useState(0)
  const [phase, setPhase] = useState(0)
  const [reduced, setReduced] = useState(false)
  const refit = useRef<() => void>(() => {})

  useEffect(() => {
    const el = root.current
    if (!el) return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const stage = el.querySelector<HTMLElement>('.scan-stage')
    const sheet = el.querySelector<HTMLElement>('.scan-report')
    const plates = Array.from(el.querySelectorAll<HTMLElement>('.scan-layer'))
    const rows = Array.from(el.querySelectorAll<HTMLElement>('.scan-report li'))
    const chips = Array.from(el.querySelectorAll<HTMLElement>('.scan-chip'))
    const rtl = document.documentElement.dir === 'rtl'
    let frame = 0
    let visible = false
    let target = 0
    let current = 0
    let last = 0
    let lastScanned = -1
    let lastPhase = -1
    let completed = false
    let top = 0
    let travel = 1
    let starts: Box[] = []
    let ends: Box[] = []

    const setVars = (p: number) => {
      el.style.setProperty('--tilt', range(p, 0, 0.16).toFixed(4))
      el.style.setProperty('--explode', range(p, 0.08, 0.3).toFixed(4))
      el.style.setProperty('--beam', clamp((p - T.beam[0]) / (T.beam[1] - T.beam[0])).toFixed(4))
      el.style.setProperty('--gather', range(p, ...T.gather).toFixed(4))
      el.style.setProperty('--collapse', range(p, ...T.fade).toFixed(4))
      el.style.setProperty('--report', range(p, ...T.paper).toFixed(4))
      el.style.setProperty('--done', range(p, ...T.done).toFixed(4))
      FLIGHTS.forEach((f, k) => el.style.setProperty(`--row${k}`, range(p, f.to - 0.025, f.to + 0.01).toFixed(4)))
    }

    const box = (node: Element, origin: DOMRect): Box => {
      const r = node.getBoundingClientRect()
      return { x: r.left - origin.left + r.width / 2, y: r.top - origin.top + r.height / 2, w: r.width, h: r.height }
    }

    // Layout is read only here (resize, entering view, caption height change), never per frame.
    const measure = () => {
      const rect = el.getBoundingClientRect()
      top = rect.top + window.scrollY
      travel = Math.max(1, el.offsetHeight - window.innerHeight)
      if (!stage || !sheet) return
      const fit = Math.min(1, (stage.clientHeight - 12) / Math.max(1, sheet.offsetHeight))
      el.style.setProperty('--fit', fit.toFixed(3))
      const origin = stage.getBoundingClientRect()
      setVars(T.handoff)
      starts = FLIGHTS.map((f) => box(plates[f.layer], origin))
      setVars(1)
      ends = FLIGHTS.map((f) => box(rows[f.row], origin))
      chips.forEach((chip, k) => {
        chip.style.width = `${ends[k].w}px`
        chip.style.height = `${ends[k].h}px`
      })
      setVars(current)
      placeChips(current)
    }
    refit.current = measure

    const placeChips = (p: number) => {
      chips.forEach((chip, k) => {
        const s = starts[k]
        const e = ends[k]
        const f = FLIGHTS[k]
        if (!s || !e) return
        const m = range(p, f.from, f.to)
        const startW = s.w * 0.55
        const startH = Math.max(e.h, 30)
        const x = s.x + (e.x - s.x) * m
        // A short arc: chips rise a little before settling into their row.
        const y = s.y + (e.y - s.y) * m - Math.sin(m * Math.PI) * 36
        const sx = (startW + (e.w - startW) * m) / e.w
        const sy = (startH + (e.h - startH) * m) / e.h
        const rot = (rtl ? 30 : -30) * (1 - m)
        chip.style.transform = `translate(${(x - e.w / 2).toFixed(1)}px, ${(y - e.h / 2).toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`
        const appear = clamp((p - f.from + 0.012) / 0.02)
        const settle = 1 - range(p, f.to - 0.012, f.to + 0.018)
        chip.style.opacity = (appear * settle).toFixed(3)
      })
    }

    const readTarget = () => {
      target = clamp((window.scrollY - top) / travel)
    }

    const draw = (p: number) => {
      setVars(p)
      placeChips(p)
      const s = Math.min(15, Math.floor(clamp((p - T.beam[0]) / (T.beam[1] - T.beam[0])) * 15.999))
      const ph = p < 0.08 ? 0 : p < T.beam[0] ? 1 : p < T.beam[1] ? 2 : p < T.handoff ? 3 : p < T.stamp ? 4 : 5
      if (s !== lastScanned) setScanned((lastScanned = s))
      if (ph !== lastPhase) setPhase((lastPhase = ph))
      if (ph === 5 && !completed) {
        completed = true
        trackEvent('scan_story_complete', { location: 'home' })
      }
    }

    const tick = (now: number) => {
      frame = 0
      const dt = last ? Math.min(64, now - last) : 16
      last = now
      current += (target - current) * (1 - Math.exp(-dt / SMOOTHING_MS))
      if (Math.abs(target - current) < 0.0004) current = target
      draw(current)
      if (current !== target) frame = requestAnimationFrame(tick)
      else last = 0
    }
    const wake = () => {
      if (query.matches || !visible) return
      readTarget()
      if (!frame) frame = requestAnimationFrame(tick)
    }
    const onResize = () => {
      if (query.matches) return
      measure()
      wake()
    }
    const applyMotionPreference = () => {
      setReduced(query.matches)
      if (query.matches) {
        cancelAnimationFrame(frame)
        frame = 0
        el.removeAttribute('style')
        setScanned(15)
        setPhase(5)
        lastScanned = lastPhase = -1
      } else {
        readTarget()
        current = target
        measure()
        draw(current)
      }
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible && !query.matches) {
        measure()
        wake()
      }
    })
    observer.observe(el)
    window.addEventListener('scroll', wake, { passive: true })
    window.addEventListener('resize', onResize)
    query.addEventListener('change', applyMotionPreference)
    applyMotionPreference()
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', wake)
      window.removeEventListener('resize', onResize)
      query.removeEventListener('change', applyMotionPreference)
      cancelAnimationFrame(frame)
    }
  }, [])

  // The final captions change height; re-measure so the report fits and chips land on the rows.
  useEffect(() => {
    if (phase >= 3 && !reduced) refit.current()
  }, [phase, reduced])

  const current = Math.max(0, Math.min(14, scanned - 1))
  const captions = [
    [
      t('It looks finished.', 'يبدو جاهزًا.'),
      t('Built fast with AI. Demo works. Keep scrolling.', 'بنيته بسرعة بالذكاء الاصطناعي. العرض يعمل. تابع النزول.'),
    ],
    [t('We take it apart.', 'نفككه طبقة طبقة.'), t('Every app is 15 layers deep.', 'كل تطبيق مكوّن من 15 طبقة.')],
    [t('We test every layer.', 'نفحص كل طبقة.'), ''],
    [
      t('13 pass. 2 need work.', '13 ناجحة. 2 تحتاج إصلاحًا.'),
      t(
        'Most of your app is solid. Two layers would hurt real users.',
        'معظم تطبيقك سليم، لكن طبقتين قد تضران عملاءك.',
      ),
    ],
    [
      t('You get the facts.', 'تستلم الحقيقة.'),
      t('A clear report, a fix plan and a fixed price.', 'تقرير واضح وخطة إصلاح وسعر ثابت.'),
    ],
  ]
  const layerName = (i: number) => pick(locale, layers[i]).split(' · ')[0]
  const found = Object.keys(risk).filter((k) => Number(k) < scanned).length
  const status = (i: number) =>
    risk[i] === 'critical' ? t('Critical', 'حرج') : risk[i] === 'warn' ? t('Warning', 'تحذير') : t('Pass', 'ناجح')

  return (
    <section
      ref={root}
      id="scan"
      className="scan"
      data-reduced={reduced}
      data-phase={phase}
      aria-label={t('How the audit works, illustrated', 'كيف يعمل الفحص، بشكل توضيحي')}
    >
      <div className="scan-sticky">
        <div className="scan-copy">
          <div className="scan-counter" aria-hidden="true">
            <span className="scan-counter-num">{String(scanned).padStart(2, '0')}</span>
            <span>/15</span>
            <span className="scan-found" data-show={found > 0}>
              {t(`${found} found`, `${found} ${found === 2 ? 'ملاحظتان' : 'ملاحظة'}`)}
            </span>
          </div>
          <div className="scan-captions">
            {captions.map(([title, body], i) => (
              <div
                key={i}
                className="scan-caption"
                data-active={Math.min(phase, 4) === i}
                aria-hidden={Math.min(phase, 4) !== i}
              >
                <h2>{title}</h2>
                {i === 2 ? (
                  <p className="scan-layer-name" data-risk={risk[current] ?? 'pass'}>
                    <bdi className="num">{String(current + 1).padStart(2, '0')}</bdi> {layerName(current)}
                    {risk[current] && <span>{status(current)}</span>}
                  </p>
                ) : (
                  <p>{body}</p>
                )}
              </div>
            ))}
          </div>
          <ol className="scan-ledger" aria-label={t('The 15 layers we check', 'الطبقات الـ15 التي نفحصها')}>
            {layers.map((_, i) => (
              <li key={i} style={{ '--i': i } as CSSProperties} data-risk={risk[i] ?? 'pass'}>
                <span className="num">{String(i + 1).padStart(2, '0')}</span>
                <span>{layerName(i)}</span>
                <em>{status(i)}</em>
              </li>
            ))}
          </ol>
        </div>

        <div className="scan-stage">
          <div className="scan-stack" aria-hidden="true">
            {layers.map((_, i) => (
              <div
                key={i}
                className="scan-layer"
                style={{ '--i': i, '--risk': risk[i] ? 1 : 0 } as CSSProperties}
                data-risk={risk[i] ?? 'pass'}
              >
                <span className="scan-layer-num">{String(i + 1).padStart(2, '0')}</span>
                {i === 0 && <AppFace locale={locale} />}
              </div>
            ))}
            <div className="scan-beam" />
          </div>
          <div className="scan-chip" data-risk="critical" aria-hidden="true" />
          <div className="scan-chip" data-risk="warn" aria-hidden="true" />
          <div className="scan-chip" data-risk="pass" aria-hidden="true" />

          <div className="scan-report" inert={phase < 4}>
            <div className="scan-report-head">
              <span>{t('PRODUCTION AUDIT', 'الفحص التقني')}</span>
              <span>{t('Illustrative example', 'مثال توضيحي')}</span>
            </div>
            <div className="scan-report-score">
              <b className="num">13</b>
              <span>{t('of 15 layers pass', 'من 15 طبقة ناجحة')}</span>
            </div>
            <ul>
              <li data-risk="critical">
                <span className="num">04</span>
                {layerName(3)}
                <em>{t('Critical', 'حرج')}</em>
              </li>
              <li data-risk="warn">
                <span className="num">03</span>
                {layerName(2)}
                <em>{t('Warning', 'تحذير')}</em>
              </li>
              <li>
                <span className="num">✓</span>
                {t('13 layers ready for launch', '13 طبقة جاهزة للإطلاق')}
              </li>
            </ul>
            <div className="scan-report-quote">
              <span>{t('Fix plan', 'خطة الإصلاح')}</span>
              <b>{t('Fixed quote included', 'مع سعر ثابت')}</b>
            </div>
            <div className="scan-stamp" aria-hidden="true">
              {t('Critical', 'حرج')}
            </div>
            <div className="scan-end">
              <Link
                className="eng-button"
                href="/audit#start"
                onClick={() => trackEvent('cta_click', { destination: 'audit', location: 'scan_story' })}
              >
                {t('Check my app · SAR 750', 'افحص تطبيقي · 750 ريال')}
              </Link>
              <Link className="eng-text-link" href="/audit/sample">
                {t('See a full sample report', 'شاهد نموذج تقرير كامل')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
