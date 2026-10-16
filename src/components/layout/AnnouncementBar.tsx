import { Fragment } from 'react'
import { getTranslations } from 'next-intl/server'
import { ArrowRight } from 'lucide-react'
import type { Locale } from '@/i18n/routing'
import { formatNumber } from '@/lib/format'
import { SmartLink } from '@/components/ui/smart-link'
import type { ShellData } from './shell-data'

/**
 * Row 0 (brief section 7): real scarcity only. The counter comes from SiteSettings; if the text
 * needs {n}/{total} and either number is missing, the bar is hidden rather than inventing one.
 */
export async function AnnouncementBar({ locale, data }: { locale: Locale; data: ShellData }) {
  const { announcement, settings } = data
  if (!announcement.enabled) return null
  const t = await getTranslations({ locale, namespace: 'common' })

  // CMS text may contain {n} and {total}; fall back to the approved copy draft.
  const raw = announcement.text || t.raw('announcement.slots')
  const tokens = String(raw).split(/(\{n\}|\{total\})/g)
  const needsNumbers = tokens.some((p) => p === '{n}' || p === '{total}')
  const { slotsLeft, slotsTotal } = settings
  if (needsNumbers && (slotsLeft == null || slotsTotal == null)) return null

  const value = (p: string) => (p === '{n}' ? slotsLeft : p === '{total}' ? slotsTotal : null)
  const href = announcement.link || '/launch-30'

  return (
    <div className="bg-ink-950 text-sand-50">
      <SmartLink
        href={href}
        className="mx-auto flex min-h-10 max-w-[1200px] items-center justify-center gap-2 px-4 py-2 text-center text-sm font-medium hover:underline hover:underline-offset-4"
      >
        <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-ignition-500" />
        <span>
          {tokens.map((part, i) => {
            const v = value(part)
            return v != null ? (
              <bdi key={i} className="num font-semibold text-ignition-500">
                {formatNumber(v, locale)}
              </bdi>
            ) : (
              <Fragment key={i}>{part}</Fragment>
            )
          })}
        </span>
        <ArrowRight className="size-4 shrink-0 rtl:rotate-180" aria-hidden="true" />
      </SmartLink>
    </div>
  )
}
