// Temporary typographic identity (brief section 6). The founders will commission a final logo:
// swap the mark path and wordmark here and every placement updates.
import { cn } from '@/lib/utils'

export type LogoVariant = 'ar' | 'en' | 'stacked' | 'mark'

/**
 * The mark: the rising stroke of the alef drawn as a launch trajectory. It leaves the ground
 * almost flat (the launch point, a hamza-like dot) and bends upward into an upright alef.
 * Single colour by default (currentColor); `accent` paints the launch dot in ignition.
 * Never mirrored in RTL: logos keep their orientation.
 */
export function LogoMark({
  className,
  accent = false,
  title,
}: {
  className?: string
  accent?: boolean
  title?: string
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('size-7 shrink-0', className)}
      fill="none"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path d="M6 26.5C14.5 26 21.5 20.5 23.5 4" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <circle cx="6" cy="26.5" r="3.25" className={accent ? 'fill-ignition-500' : undefined} fill={accent ? undefined : 'currentColor'} />
    </svg>
  )
}

export function Logo({
  variant = 'ar',
  className,
  accent = true,
}: {
  variant?: LogoVariant
  className?: string
  accent?: boolean
}) {
  if (variant === 'mark') return <LogoMark className={className} accent={accent} />

  if (variant === 'stacked') {
    return (
      <span className={cn('inline-flex flex-col items-center gap-1 font-display font-bold leading-none', className)}>
        <LogoMark className="size-10" accent={accent} />
        <span lang="ar" dir="rtl" className="text-3xl">
          إطلاق
        </span>
        <span lang="en" dir="ltr" className="text-sm font-semibold tracking-[0.2em] uppercase">
          Etleq
        </span>
      </span>
    )
  }

  const isAr = variant === 'ar'
  return (
    <span className={cn('inline-flex items-center gap-2 font-display font-bold leading-none', className)}>
      <LogoMark accent={accent} />
      <span lang={isAr ? 'ar' : 'en'} dir={isAr ? 'rtl' : 'ltr'} className={cn(isAr ? 'text-[1.6rem] pb-1' : 'text-2xl tracking-tight')}>
        {isAr ? 'إطلاق' : 'Etleq'}
      </span>
    </span>
  )
}
