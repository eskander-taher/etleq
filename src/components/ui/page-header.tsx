import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Container } from './container'
import { Trajectory } from './trajectory'

/** Top of an inner page: optional breadcrumbs, eyebrow, H1 and lead, with the trajectory motif. */
export function PageHeader({
  eyebrow,
  title,
  lead,
  breadcrumbs,
  children,
  motif = true,
  className,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  lead?: ReactNode
  breadcrumbs?: ReactNode
  children?: ReactNode
  motif?: boolean
  className?: string
}) {
  return (
    <header id="hero" className={cn('relative overflow-hidden border-b border-sand-300 bg-sand-100', className)}>
      {motif ? (
        <div
          className="pointer-events-none absolute -bottom-6 end-0 hidden w-[28rem] opacity-60 md:block"
          aria-hidden="true"
        >
          <Trajectory milestones={false} />
        </div>
      ) : null}
      <Container className="relative py-12 sm:py-16 lg:py-20">
        {breadcrumbs ? <div className="mb-6">{breadcrumbs}</div> : null}
        {eyebrow ? <p className="mb-3 text-sm font-semibold text-ink-600">{eyebrow}</p> : null}
        <h1 className="max-w-3xl text-display-1 font-bold">{title}</h1>
        {lead ? <p className="mt-5 max-w-2xl text-lg text-ink-600 sm:text-xl">{lead}</p> : null}
        {children ? <div className="mt-8">{children}</div> : null}
      </Container>
    </header>
  )
}
