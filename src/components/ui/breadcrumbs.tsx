import { getLocale, getTranslations } from 'next-intl/server'
import { ChevronRight } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { breadcrumbNode, graph } from '@/lib/schema'
import { JsonLd } from '@/components/seo/JsonLd'
import { normalizeInternalHref } from './smart-link'

export type Crumb = { label: string; href: string }

/**
 * Visible breadcrumb trail + BreadcrumbList JSON-LD. Pass the trail without Home: Home is
 * prepended automatically (pass `includeHome={false}` to opt out). Hrefs are locale-less paths.
 * The last item is the current page (aria-current, not a link).
 */
export async function Breadcrumbs({
  items,
  includeHome = true,
  className,
  jsonLd = true,
  locale: localeProp,
}: {
  items: Crumb[]
  /** Defaults to the request locale. */
  locale?: 'ar' | 'en'
  includeHome?: boolean
  className?: string
  /** Set false when the page already emits BreadcrumbList inside its own @graph. */
  jsonLd?: boolean
}) {
  const locale = localeProp ?? ((await getLocale()) as 'ar' | 'en')
  const t = await getTranslations({ locale, namespace: 'common' })
  const trail = includeHome && items[0]?.href !== '/' ? [{ label: t('nav.home'), href: '/' }, ...items] : items
  if (!trail.length) return null

  return (
    <>
      <nav aria-label={t('a11y.breadcrumbs')} className={cn('text-sm', className)}>
        <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-stone-500 in-data-[tone=dark]:text-sand-300">
          {trail.map((c, i) => {
            const last = i === trail.length - 1
            return (
              <li key={`${c.href}-${i}`} className="inline-flex items-center gap-1">
                {last ? (
                  <span aria-current="page" className="font-medium text-ink-950 in-data-[tone=dark]:text-sand-50">
                    {c.label}
                  </span>
                ) : (
                  <>
                    <Link
                      href={normalizeInternalHref(c.href)}
                      locale={localeProp}
                      className="inline-flex min-h-11 items-center underline-offset-4 md:min-h-6 hover:text-ink-950 hover:underline in-data-[tone=dark]:hover:text-sand-50"
                    >
                      {c.label}
                    </Link>
                    <ChevronRight className="size-4 shrink-0 rtl:rotate-180" aria-hidden="true" />
                  </>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
      {jsonLd ? <JsonLd data={graph(breadcrumbNode(trail, locale))} /> : null}
    </>
  )
}
