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

/**
 * Day 1 → Day 30 as a clean three-step line. Dots and labels share one 3-column grid (each label is
 * centred under its own dot), so they line up at every width and in both directions. The progress
 * line grows in the reading direction once; static under prefers-reduced-motion.
 */
export function TrajectorySteps({ steps, className }: { steps: { title: string; text: string }[]; className?: string }) {
  const last = steps.length - 1
  return (
    <ol className={cn('relative grid', className)} style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      <style>{`
        .etq-line { transform-origin: 0 50%; }
        [dir='rtl'] .etq-line { transform-origin: 100% 50%; }
        @media (prefers-reduced-motion: no-preference) {
          .etq-line { transform: scaleX(0); animation: etq-grow 1.4s cubic-bezier(.22,.61,.36,1) .3s forwards; }
          .etq-step-dot { opacity: 0; animation: etq-fade .3s ease-out forwards; }
        }
        @keyframes etq-grow { to { transform: scaleX(1); } }
        @keyframes etq-fade { to { opacity: 1; } }
      `}</style>
      {/* Track and progress run from the first dot's centre to the last one's. */}
      <span
        aria-hidden="true"
        className="absolute top-2 h-0.5 -translate-y-1/2 rounded-full bg-sand-300"
        style={{ insetInline: `${50 / steps.length}%` }}
      />
      <span
        aria-hidden="true"
        className="etq-line absolute top-2 h-0.5 -translate-y-1/2 rounded-full bg-ignition-500"
        style={{ insetInline: `${50 / steps.length}%` }}
      />
      {steps.map((s, i) => (
        <li key={s.title} className="relative flex flex-col items-center px-1 text-center">
          <span
            aria-hidden="true"
            className={cn(
              'etq-step-dot relative z-10 block rounded-full ring-4 ring-sand-50',
              i === 0 || i === last ? 'size-4 bg-ignition-500' : 'my-0.5 size-3 bg-ink-950',
            )}
            style={{ animationDelay: `${0.3 + (1.4 * i) / Math.max(1, last)}s` }}
          />
          <span className="mt-2 block font-display font-bold">{s.title}</span>
          <span className="text-ink-600">{s.text}</span>
        </li>
      ))}
    </ol>
  )
}
