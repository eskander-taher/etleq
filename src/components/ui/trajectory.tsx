import { cn } from '@/lib/utils'

/**
 * Decorative "trajectory" motif: a launch arc that draws itself once (CSS stroke-dashoffset on
 * a pathLength=1 path). It rises in the reading direction, so it mirrors in RTL. Under
 * prefers-reduced-motion it renders fully drawn with no animation.
 */
export function Trajectory({
  className,
  animate = true,
  milestones = true,
  tone = 'light',
}: {
  className?: string
  animate?: boolean
  /** Small dots along the arc (e.g. Day 1 → Day 30). */
  milestones?: boolean
  tone?: 'light' | 'dark'
}) {
  const track = tone === 'dark' ? 'stroke-ink-800' : 'stroke-sand-300'
  return (
    <svg
      viewBox="0 0 400 200"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn('w-full overflow-visible rtl:-scale-x-100', className)}
    >
      <style>{`
        .etq-arc { stroke-dasharray: 1; stroke-dashoffset: 0; }
        @media (prefers-reduced-motion: no-preference) {
          .etq-arc[data-animate='true'] { stroke-dashoffset: 1; animation: etq-draw 1.6s cubic-bezier(.22,.61,.36,1) .2s forwards; }
          .etq-dot[data-animate='true'] { opacity: 0; animation: etq-fade .3s ease-out forwards; }
        }
        @keyframes etq-draw { to { stroke-dashoffset: 0; } }
        @keyframes etq-fade { to { opacity: 1; } }
      `}</style>
      <path d="M8 188 C 140 186, 300 150, 384 16" className={track} strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round" />
      <path
        d="M8 188 C 140 186, 300 150, 384 16"
        pathLength={1}
        data-animate={animate}
        className="etq-arc stroke-ignition-500"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {milestones ? (
        <>
          <circle cx="8" cy="188" r="6" className="fill-ignition-500" />
          {[
            [150, 180, '0.7s'],
            [270, 140, '1.1s'],
          ].map(([cx, cy, delay]) => (
            <circle
              key={String(cx)}
              cx={cx as number}
              cy={cy as number}
              r="4"
              data-animate={animate}
              className={cn('etq-dot', tone === 'dark' ? 'fill-sand-50' : 'fill-ink-950')}
              style={{ animationDelay: delay as string }}
            />
          ))}
          <circle cx="384" cy="16" r="8" data-animate={animate} className="etq-dot fill-ignition-500" style={{ animationDelay: '1.7s' }} />
        </>
      ) : null}
    </svg>
  )
}
