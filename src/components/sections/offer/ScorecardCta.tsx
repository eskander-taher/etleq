import { getTranslations } from 'next-intl/server'
import { ArrowRight } from 'lucide-react'
import { cn, localePath } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { TrackedAnchor } from '@/components/ui/tracked-link'

/** Mid-page primary CTA: the scorecard button with its "short questions" microcopy. */
export async function ScorecardCta({
  locale,
  location,
  tone = 'light',
  long = false,
  className,
  children,
}: {
  locale: 'ar' | 'en'
  location: string
  tone?: 'light' | 'dark'
  /** "Take the 2-minute scorecard" instead of "Take the scorecard". */
  long?: boolean
  className?: string
  /** Extra line under the microcopy (e.g. the "from {price}" line). */
  children?: React.ReactNode
}) {
  const tc = await getTranslations({ locale, namespace: 'common' })
  return (
    <div className={cn('flex flex-col items-start gap-2', className)}>
      <TrackedAnchor href={localePath(locale, '/scorecard')} event="cta_click" params={{ cta_id: 'scorecard', location }} className={buttonVariants({ size: 'lg' })}>
        {long ? tc('cta.scorecardLong') : tc('cta.scorecard')}
        <ArrowRight className="size-5 rtl:rotate-180" aria-hidden="true" />
      </TrackedAnchor>
      <p className={cn('text-sm', tone === 'dark' ? 'text-sand-300' : 'text-ink-600')}>{tc('cta.scorecardMicro')}</p>
      {children}
    </div>
  )
}
