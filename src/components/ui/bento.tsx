import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Bento grid for "what's included": 1 column on phones, 2 on tablets, 6-track grid on desktop. */
export function BentoGrid({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:gap-5', className)} {...props} />
}

const spans = {
  third: 'lg:col-span-2',
  half: 'lg:col-span-3',
  wide: 'sm:col-span-2 lg:col-span-4',
  full: 'sm:col-span-2 lg:col-span-6',
  tall: 'lg:col-span-2 lg:row-span-2',
} as const

const tones = {
  light: 'border-sand-300 bg-sand-50 text-ink-950',
  alt: 'border-sand-300 bg-sand-100 text-ink-950',
  dark: 'border-ink-800 bg-ink-950 text-sand-50',
  accent: 'border-ignition-500 bg-ignition-500 text-ink-950',
} as const

export function BentoItem({
  span = 'third',
  tone = 'light',
  icon,
  title,
  children,
  className,
}: {
  span?: keyof typeof spans
  tone?: keyof typeof tones
  icon?: ReactNode
  title: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div
      data-tone={tone === 'dark' ? 'dark' : undefined}
      className={cn('flex flex-col gap-3 rounded-card border p-6 sm:p-7', spans[span], tones[tone], className)}
    >
      {icon ? (
        <span
          className={cn(
            'inline-flex size-11 items-center justify-center rounded-button',
            tone === 'dark' ? 'bg-ink-800 text-ignition-500' : tone === 'accent' ? 'bg-ink-950 text-ignition-500' : 'bg-ink-950 text-sand-50',
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      ) : null}
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {children ? (
        <div className={cn('text-[0.95rem]', tone === 'dark' ? 'text-sand-300' : tone === 'accent' ? 'text-ink-950' : 'text-ink-600')}>
          {children}
        </div>
      ) : null}
    </div>
  )
}
