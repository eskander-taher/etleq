'use client'

import { usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Locale } from '@/i18n/routing'
import { trackEvent } from '@/lib/analytics'
import { useAlternatePath } from './alternate'
import { swapLocalePath } from './locale-paths'

/**
 * Links to the same document in the other locale. A page can override the target with
 * <SetAlternatePath> (context) or the `alternateHref` prop when its document is missing there.
 * Plain anchor: switching language reloads <html lang dir> cleanly.
 */
export function LanguageSwitcher({
  alternateHref,
  className,
  tone = 'light',
  showNote = false,
  onNavigate,
}: {
  alternateHref?: string
  className?: string
  tone?: 'light' | 'dark'
  /** Show the "not available, going to the section" note as visible text (mobile menu). */
  showNote?: boolean
  onNavigate?: () => void
}) {
  const locale = useLocale() as Locale
  const t = useTranslations('common')
  const pathname = usePathname() || '/'
  const override = useAlternatePath()
  const target: Locale = locale === 'ar' ? 'en' : 'ar'
  const href = alternateHref || override?.[target] || swapLocalePath(pathname, target)
  const note = override?.note ? t('language.sectionNote') : undefined
  const noteId = `lang-note-${tone}-${showNote ? 'v' : 'h'}`

  return (
    <span className={cn('inline-flex flex-col', className)}>
      <a
        href={href}
        hrefLang={target}
        title={note}
        aria-describedby={note ? noteId : undefined}
        onClick={() => {
          try {
            trackEvent('language_switch', { from: locale, to: target })
          } catch {
            /* never block navigation */
          }
          onNavigate?.()
        }}
        className={cn(
          'inline-flex min-h-12 items-center gap-2 rounded-button px-3 font-semibold transition-colors duration-200',
          tone === 'dark' ? 'text-sand-50 hover:bg-ink-800' : 'text-ink-950 hover:bg-sand-100',
        )}
      >
        <Globe className="size-5" aria-hidden="true" />
        <span lang={target}>{t(`language.${target}`)}</span>
      </a>
      {note ? (
        <span
          id={noteId}
          className={cn(showNote ? 'max-w-72 px-3 text-sm' : 'sr-only', tone === 'dark' ? 'text-sand-300' : 'text-ink-600')}
        >
          {note}
        </span>
      ) : null}
    </span>
  )
}
