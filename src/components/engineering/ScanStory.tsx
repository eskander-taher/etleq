'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from '@/i18n/navigation'
import { trackEvent } from '@/lib/analytics'
import { layers, pick } from './content'
import './scan-story.css'

/** Illustrative only: the same two risks as the sample report (layer 03 warning, layer 04 critical). */
const risk: Record<number, 'warn' | 'critical'> = { 2: 'warn', 3: 'critical' }

const clamp = (v: number) => Math.min(1, Math.max(0, v))
const ease = (v: number) => v * v * (3 - 2 * v)
const range = (p: number, from: number, to: number) => ease(clamp((p - from) / (to - from)))

/** Scroll position drives the story; every frame is a pure function of progress, so scrolling back rewinds it. */
export function ScanStory({ locale }: { locale: string }) {
  const t = (en: string, ar: string) => pick(locale, [en, ar])
  const root = useRef<HTMLElement>(null)
  const [scanned, setScanned] = useState(0)
  const [phase, setPhase] = useState(0)
  const [reduced, setReduced] = useState(false)
  const done = useRef(false)

  useEffect(() => {
    const el = root.current
    if (!el) return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let visible = false
    let lastScanned = -1
    let lastPhase = -1

    const paint = () => {
      frame = 0
      if (query.matches) {
        setReduced(true)
        setScanned(15)
        setPhase(4)
        return
      }
      setReduced(false)
      const rect = el.getBoundingClientRect()
      const p = clamp(-rect.top / Math.max(1, rect.height - window.innerHeight))
      const collapse = range(p, 0.72, 0.86)
      const vars: Record<string, number> = {
        '--tilt': range(p, 0, 0.16) * (1 - collapse * 0.6),
        '--explode': range(p, 0.08, 0.3) * (1 - collapse),
        '--collapse': collapse,
        '--report': range(p, 0.78, 0.94),
        '--beam': clamp((p - 0.3) / 0.4),
      }
      for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v.toFixed(4))
      // Short phones (Instagram's in-app browser): shrink the report to the room the stage has.
      const stage = el.querySelector<HTMLElement>('.scan-stage')
      const sheet = el.querySelector<HTMLElement>('.scan-report')
      if (stage && sheet) {
        const fit = Math.min(1, (stage.clientHeight - 12) / Math.max(1, sheet.offsetHeight))
        el.style.setProperty('--fit', fit.toFixed(3))
      }
      const s = Math.min(15, Math.floor(clamp((p - 0.3) / 0.4) * 15.999))
      const ph = p < 0.08 ? 0 : p < 0.3 ? 1 : p < 0.74 ? 2 : p < 0.9 ? 3 : 4
      if (s !== lastScanned) setScanned((lastScanned = s))
      if (ph !== lastPhase) setPhase((lastPhase = ph))
      if (ph === 4 && !done.current) {
        done.current = true
        trackEvent('scan_story_complete', { location: 'home' })
      }
    }
    const request = () => {
      if (visible && !frame) frame = requestAnimationFrame(paint)
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      request()
    })
    observer.observe(el)
    window.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', request)
    query.addEventListener('change', paint)
    paint()
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', request)
      window.removeEventListener('resize', request)
      query.removeEventListener('change', paint)
      cancelAnimationFrame(frame)
    }
  }, [])

  const current = Math.max(0, Math.min(14, scanned - 1))
  const captions = [
    [
      t('It looks finished.', 'يبدو جاهزًا.'),
      t('Built fast with AI. Demo works. Keep scrolling.', 'بنيته بسرعة بالذكاء الاصطناعي. العرض يعمل. تابع النزول.'),
    ],
    [t('We take it apart.', 'نفككه طبقة طبقة.'), t('Every app is 15 layers deep.', 'كل تطبيق مكوّن من 15 طبقة.')],
    [t('We test every layer.', 'نفحص كل طبقة.'), ''],
    [
      t('You get the facts.', 'تستلم الحقيقة.'),
      t('A clear report, a fix plan and a fixed price.', 'تقرير واضح وخطة إصلاح وسعر ثابت.'),
    ],
  ]
  const layerName = (i: number) => pick(locale, layers[i]).split(' · ')[0]
  const found = Object.keys(risk).filter((k) => Number(k) < scanned).length

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
            {found > 0 && (
              <span className="scan-found">
                {t(`${found} found`, `${found} ${found === 1 ? 'ملاحظة' : 'ملاحظتان'}`)}
              </span>
            )}
          </div>
          {captions.map(([title, body], i) => (
            <div
              key={i}
              className="scan-caption"
              data-active={Math.min(phase, 3) === i}
              aria-hidden={Math.min(phase, 3) !== i}
            >
              <h2>{title}</h2>
              {i === 2 ? (
                <p className="scan-layer-name" data-risk={risk[current] ?? 'pass'}>
                  <bdi className="num">{String(current + 1).padStart(2, '0')}</bdi> {layerName(current)}
                  {risk[current] && (
                    <span>{risk[current] === 'critical' ? t('Critical', 'حرج') : t('Warning', 'تحذير')}</span>
                  )}
                </p>
              ) : (
                <p>{body}</p>
              )}
            </div>
          ))}
        </div>

        <div className="scan-stage">
          <div className="scan-stack" aria-hidden="true">
            {layers.map((_, i) => (
              <div
                key={i}
                className="scan-layer"
                style={{ '--i': i } as CSSProperties}
                data-state={i < scanned ? (risk[i] ?? 'pass') : 'idle'}
                data-current={phase === 2 && i === scanned - 1}
              >
                <span className="scan-layer-num">{String(i + 1).padStart(2, '0')}</span>
                {i === 0 && (
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
                )}
              </div>
            ))}
          </div>

          <div className="scan-report" inert={phase < 3}>
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
