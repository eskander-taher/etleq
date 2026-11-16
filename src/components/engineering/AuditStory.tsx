'use client'

import { useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  CheckCheck,
  Code2,
  FileCheck2,
  Gauge,
  Languages,
  LockKeyhole,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { trackEvent } from '@/lib/analytics'
import { pick } from './content'
import './audit-story.css'

const durations = [2800, 4400, 3200]
const preference = '(prefers-reduced-motion: reduce)'
const subscribe = (notify: () => void) => {
  const query = window.matchMedia(preference)
  query.addEventListener('change', notify)
  return () => query.removeEventListener('change', notify)
}
const reducedSnapshot = () => window.matchMedia(preference).matches
const serverSnapshot = () => true

/** An illustrative, once-only story. No visitor data or scan results are implied. */
export function AuditStory({ locale }: { locale: string }) {
  const t = (en: string, ar: string) => pick(locale, [en, ar])
  const root = useRef<HTMLDivElement>(null)
  const started = useRef(false)
  const [stage, setStage] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [manual, setManual] = useState(true)
  const [complete, setComplete] = useState(false)
  const [run, setRun] = useState(0)
  const reduced = useSyncExternalStore(subscribe, reducedSnapshot, serverSnapshot)
  const id = useId()
  const labels = [t('Your app', 'تطبيقك'), t('Our review', 'فحصنا'), t('Your plan', 'خطتك')]
  const titles = [
    t('It looks ready. Is it?', 'يبدو جاهزًا. هل هو كذلك؟'),
    t('Look beneath the surface.', 'ننظر إلى ما وراء الواجهة.'),
    t('Know exactly what comes next.', 'اعرف خطوتك التالية بوضوح.'),
  ]
  const descriptions = [
    t('Share your app. We agree the scope and secure access.', 'شارك تطبيقك. نتفق على النطاق والوصول الآمن.'),
    t('15 engineering layers. Risks explained in plain language.', '15 طبقة هندسية. مخاطر نشرحها بلغة واضحة.'),
    t(
      'A bilingual report, prioritized fixes and a fixed quote.',
      'تقرير باللغتين، وإصلاحات مرتبة بالأولوية، وسعر ثابت.',
    ),
  ]

  useEffect(() => {
    if (reduced || !root.current || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.35 && !started.current && !document.hidden) {
          started.current = true
          setManual(false)
          setPlaying(true)
        } else if (entry.intersectionRatio < 0.35) {
          setPlaying(false)
        }
      },
      { threshold: 0.35 },
    )
    observer.observe(root.current)
    const pauseWhenHidden = () => {
      if (document.hidden) setPlaying(false)
    }
    document.addEventListener('visibilitychange', pauseWhenHidden)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', pauseWhenHidden)
    }
  }, [reduced])

  useEffect(() => {
    if (!playing || reduced) return
    const timer = setTimeout(() => {
      if (stage < 2) setStage(stage + 1)
      else {
        setPlaying(false)
        setComplete(true)
      }
    }, durations[stage])
    return () => clearTimeout(timer)
  }, [stage, playing, reduced, run])

  function selectStage(index: number) {
    started.current = true
    setPlaying(false)
    setManual(true)
    setComplete(false)
    setStage(index)
    trackEvent('cta_click', { location: 'audit_walkthrough', destination: ['app', 'review', 'plan'][index] })
  }
  function playback() {
    started.current = true
    if (playing) {
      setPlaying(false)
      return
    }
    if (complete || manual) {
      setStage(0)
      setRun((value) => value + 1)
    }
    setComplete(false)
    setManual(false)
    setPlaying(true)
  }

  return (
    <div
      ref={root}
      className="audit-story"
      data-animate={!manual && !complete && !reduced}
      data-playing={playing && !reduced}
    >
      <div className="story-topline">
        <span>
          <span className="story-dot" />
          {t('FROM APP TO ANSWERS', 'من التطبيق إلى الوضوح')}
        </span>
        {!reduced && (
          <button type="button" onClick={playback} className="story-playback">
            {playing ? <Pause size={14} /> : complete ? <RotateCcw size={14} /> : <Play size={14} />}
            {playing
              ? t('Pause', 'إيقاف مؤقت')
              : complete
                ? t('Replay', 'إعادة العرض')
                : manual
                  ? t('Play story', 'شاهد الشرح')
                  : t('Continue', 'متابعة')}
          </button>
        )}
      </div>
      <div className="story-steps" role="group" aria-label={t('Explore the audit process', 'استكشف خطوات الفحص')}>
        {labels.map((label, index) => (
          <button
            key={label}
            type="button"
            aria-pressed={stage === index}
            aria-controls={id}
            onClick={() => selectStage(index)}
          >
            <span className="story-step-number" aria-hidden="true">
              {index < stage ? <Check size={13} /> : `0${index + 1}`}
            </span>
            {label}
          </button>
        ))}
      </div>
      <div id={id} className="story-body" aria-live={playing ? 'off' : 'polite'} aria-atomic="true">
        <div className="story-caption">
          <h2>{titles[stage]}</h2>
          <p>{descriptions[stage]}</p>
        </div>
        <div key={`${run}-${stage}`} className={`story-canvas story-stage-${stage}`}>
          <div className="story-grid" aria-hidden="true" />
          {stage === 0 && (
            <div className="story-app-scene">
              <div className="story-source">
                <Code2 size={15} />
                {t('Built with AI. Built by you.', 'بنيته بالذكاء الاصطناعي.')}
              </div>
              <div className="story-app-window">
                <div className="story-app-bar">
                  <span className="story-app-mark">
                    <Code2 size={14} />
                  </span>
                  <b>{t('Your customer portal', 'بوابة عملائك')}</b>
                  <span className="story-window-dots" aria-hidden="true">
                    •••
                  </span>
                </div>
                <div className="story-app-content">
                  <div className="story-app-greeting">
                    {t('Welcome back.', 'أهلًا بعودتك.')}
                    <span className="story-avatar" aria-hidden="true" />
                  </div>
                  <div className="story-app-tiles">
                    <div>
                      <span>{t('Orders', 'الطلبات')}</span>
                      <strong>24</strong>
                      <span className="story-mini-chart" aria-hidden="true">
                        {[24, 42, 33, 58, 47, 72, 88].map((height, index) => (
                          <i key={index} style={{ height: `${height}%` }} />
                        ))}
                      </span>
                    </div>
                    <div>
                      <span>{t('Customers', 'العملاء')}</span>
                      <strong>128</strong>
                      <span className="story-avatar-row" aria-hidden="true">
                        <i />
                        <i />
                        <i />
                        <i />
                      </span>
                    </div>
                  </div>
                  <div className="story-app-row">
                    <span className="story-row-icon">
                      <Check size={13} />
                    </span>
                    {t('New order received', 'تم استلام طلب جديد')}
                    <span className="story-row-time">{t('Just now', 'الآن')}</span>
                  </div>
                </div>
              </div>
              <div className="story-question">
                <ShieldCheck size={16} />
                {t('But is the data protected?', 'لكن هل البيانات محمية؟')}
              </div>
            </div>
          )}
          {stage === 1 && (
            <div className="story-review-scene">
              <div className="story-review-header">
                <div className="story-review-icon">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <strong>{t('15-layer review', 'فحص من 15 طبقة')}</strong>
                  <span>{t('From the interface to the infrastructure', 'من الواجهة إلى البنية التحتية')}</span>
                </div>
              </div>
              <div className="story-layer-grid" aria-hidden="true">
                {Array.from({ length: 15 }, (_, index) => (
                  <span
                    key={index}
                    style={{ '--order': index } as CSSProperties}
                    data-risk={[3, 8, 13].includes(index)}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                ))}
                <i className="story-scan-line" />
              </div>
              <div className="story-findings">
                <div className="story-finding" style={{ '--order': 0 } as CSSProperties}>
                  <ShieldCheck size={16} />
                  <span>
                    <b>{t('Security', 'الأمان')}</b>
                    {t('One account can see another’s data', 'حساب يرى بيانات حساب آخر')}
                  </span>
                  <em>{t('Critical', 'حرج')}</em>
                </div>
                <div className="story-finding" style={{ '--order': 1 } as CSSProperties}>
                  <Gauge size={16} />
                  <span>
                    <b>{t('Speed', 'السرعة')}</b>
                    {t('Too much data loads at once', 'تحميل بيانات أكثر من اللازم')}
                  </span>
                  <em>{t('Warning', 'تحذير')}</em>
                </div>
                <div className="story-finding" style={{ '--order': 2 } as CSSProperties}>
                  <Languages size={16} />
                  <span>
                    <b>{t('Arabic', 'العربية')}</b>
                    {t('Checkout layout breaks on mobile', 'خلل بتنسيق الدفع على الجوال')}
                  </span>
                  <em>{t('Warning', 'تحذير')}</em>
                </div>
              </div>
            </div>
          )}
          {stage === 2 && (
            <div className="story-report-scene">
              <div className="story-report-sheet">
                <div className="story-report-header">
                  <FileCheck2 size={25} />
                  <div>
                    <span>{t('YOUR PRODUCTION AUDIT', 'تقرير فحص تطبيقك')}</span>
                    <strong>{t('A clear plan to move forward.', 'خطة واضحة لتتقدم.')}</strong>
                  </div>
                  <span className="story-report-language">AR / EN</span>
                </div>
                <div className="story-report-columns">
                  <span>{t('Finding', 'الملاحظة')}</span>
                  <span>{t('Recommended fix', 'الإصلاح المقترح')}</span>
                </div>
                {[
                  [t('Exposed data', 'بيانات مكشوفة'), t('Enforce account ownership', 'التحقق من ملكية الحساب')],
                  [t('Slow queries', 'استعلامات بطيئة'), t('Load one page at a time', 'تحميل صفحة واحدة كل مرة')],
                  [
                    t('Broken Arabic layout', 'خلل بالتنسيق العربي'),
                    t('Fix & test RTL screens', 'تصحيح واختبار اتجاه العرض'),
                  ],
                ].map(([finding, fix], index) => (
                  <div className="story-plan-row" key={finding} style={{ '--order': index } as CSSProperties}>
                    <span>
                      <i>{index + 1}</i>
                      {finding}
                    </span>
                    <ArrowUpRight size={14} />
                    <strong>{fix}</strong>
                  </div>
                ))}
                <div className="story-quote">
                  <CheckCheck size={17} />
                  <span>{t('Priorities + fixed build quote', 'أولويات + سعر ثابت للتنفيذ')}</span>
                </div>
              </div>
              <div className="story-ownership">
                <ArrowDown size={14} />
                <span>{t('Use it with your team. Or build with us.', 'نفذ مع فريقك. أو دعنا ننفذ معك.')}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="story-footer">
        <span>
          <LockKeyhole size={12} />
          {t('Illustrative walkthrough. No live scan.', 'شرح توضيحي. ليس فحصًا مباشرًا.')}
        </span>
        <Link href="/audit/sample">
          {t('See sample report', 'شاهد نموذج التقرير')}
          <ArrowUpRight size={14} />
        </Link>
      </div>
    </div>
  )
}
