import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'
import { Container } from './container'

const tones = {
  light: 'bg-sand-50 text-ink-950',
  alt: 'bg-sand-100 text-ink-950',
  dark: 'bg-ink-950 text-sand-50',
} as const

export type SectionTone = keyof typeof tones

export function Section({
  tone = 'light',
  className,
  containerClassName,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { tone?: SectionTone; containerClassName?: string }) {
  return (
    <section className={cn('py-16 lg:py-28', tones[tone], className)} data-tone={tone} {...props}>
      <Container className={containerClassName}>{children}</Container>
    </section>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  className,
  as: As = 'h2',
}: {
  eyebrow?: string
  title: string
  lead?: string
  className?: string
  as?: 'h1' | 'h2'
}) {
  return (
    <div className={cn('max-w-3xl', className)}>
      {eyebrow && <p className="mb-3 text-sm font-semibold text-ignition-700 in-data-[tone=dark]:text-ignition-500">{eyebrow}</p>}
      <As className="text-display-2 font-bold">{title}</As>
      {lead && <p className="mt-4 text-lg text-ink-600 in-data-[tone=dark]:text-sand-300">{lead}</p>}
    </div>
  )
}
