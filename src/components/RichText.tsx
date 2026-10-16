import type { ReactNode } from 'react'
import { getLocale, getTranslations } from 'next-intl/server'
import {
  RichText as LexicalRichText,
  type JSXConverters,
  type JSXConvertersFunction,
} from '@payloadcms/richtext-lexical/react'
import { AlertTriangle, CheckCircle2, Info, Lightbulb } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { ButtonLink } from '@/components/ui/button-link'
import { WhatsAppButton } from '@/components/ui/whatsapp-button'
import { SourceCite } from '@/components/ui/source-cite'
import { cn } from '@/lib/utils'
import { collectHeadings, mediaOf, publicRelations, type Loc } from '@/components/content/lib'
import { ComparisonTable, type ComparisonTableData } from '@/components/content/ComparisonTable'
import { FaqList } from '@/components/content/FaqList'
import { VideoFacade } from '@/components/content/VideoFacade'

/* eslint-disable @typescript-eslint/no-explicit-any */
type RichTextData = any

// Field names follow src/blocks/richTextBlocks.ts; the alternates (sourceLabel/date, title) are accepted too.
type CalloutFields = { tone?: string | null; title?: string | null; body?: unknown }
type StatFields = {
  value?: string | null
  label?: string | null
  sourceName?: string | null
  sourceLabel?: string | null
  sourceUrl?: string | null
  checkedAt?: string | null
  date?: string | null
}
type FaqFields = {
  title?: string | null
  items?: { question?: string | null; answer?: unknown }[] | null
  faqs?: unknown[] | null
}
type CtaFields = {
  heading?: string | null
  title?: string | null
  body?: string | null
  action?: 'scorecard' | 'book' | 'whatsapp' | 'playbook' | 'custom' | null
  href?: string | null
  label?: string | null
}
type VideoFields = { url?: string | null; title?: string | null; transcript?: string | null; posterImage?: unknown; platform?: string | null }

const calloutTone: Record<string, { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: 'border-ink-600/30 bg-sand-100' },
  tip: { icon: Lightbulb, className: 'border-ignition-500/40 bg-ignition-500/5' },
  warning: { icon: AlertTriangle, className: 'border-ignition-700/50 bg-ignition-700/5' },
  success: { icon: CheckCircle2, className: 'border-verified-600/40 bg-verified-600/5' },
  disclaimer: { icon: Info, className: 'border-sand-300 bg-white text-sm text-ink-600' },
}

const ctaHref: Record<string, string> = { scorecard: '/scorecard', book: '/book', playbook: '/playbook' }

/** Internal link targets → public paths. Guides route by type. */
function docPath(relationTo: string, doc: any): string {
  const slug = typeof doc === 'object' && doc ? doc.slug : undefined
  if (!slug) return '/'
  switch (relationTo) {
    case 'models':
      return `/models/${slug}`
    case 'solutions':
      return `/solutions/${slug}`
    case 'projects':
      return `/projects/${slug}`
    case 'posts':
      return `/blog/${slug}`
    case 'news':
      return `/news/${slug}`
    case 'guides':
      return doc.type === 'comparison' ? `/compare/${slug}` : `/cost/${slug}`
    case 'jobs':
      return `/careers/${slug}`
    case 'authors':
      return `/authors/${slug}`
    case 'categories':
      return `/blog/category/${slug}`
    default:
      return slug === 'home' ? '/' : `/${slug}`
  }
}

/** Accepts a plain string or nested Lexical data for block bodies. */
function bodyOf(body: unknown, converters: JSXConverters | JSXConvertersFunction): ReactNode {
  if (!body) return null
  if (typeof body === 'string') return <p className="whitespace-pre-line">{body}</p>
  if (typeof body === 'object' && 'root' in (body as object)) {
    return <LexicalRichText data={body as RichTextData} converters={converters} disableContainer />
  }
  return null
}

/**
 * Renders Payload Lexical rich text with Etleq's custom blocks.
 * h2/h3 headings get stable ids that match `collectHeadings()` so the table of contents can link to them.
 */
export async function RichText({
  data,
  className,
  locale: localeProp,
}: {
  data: RichTextData
  className?: string
  locale?: Loc
}) {
  if (!data?.root) return null
  const locale = (localeProp ?? ((await getLocale()) as Loc)) as Loc
  const t = await getTranslations({ locale, namespace: 'content' })
  const { ids } = collectHeadings(data)

  const converters: JSXConvertersFunction = ({ defaultConverters }) => {
    const own: JSXConverters = {
      ...defaultConverters,
      heading: ({ node, nodesToJSX }: any) => {
        const Tag = (['h2', 'h3', 'h4', 'h5', 'h6'].includes(node.tag) ? node.tag : 'h2') as 'h2'
        return (
          <Tag id={ids.get(node)} className="scroll-mt-28">
            {nodesToJSX({ nodes: node.children })}
          </Tag>
        )
      },
      link: ({ node, nodesToJSX }: any) => {
        const children = nodesToJSX({ nodes: node.children })
        const f = node.fields ?? {}
        if (f.linkType === 'internal' && f.doc) {
          return <Link href={docPath(f.doc.relationTo, f.doc.value)}>{children}</Link>
        }
        const href: string = f.url ?? '#'
        if (href.startsWith('/')) return <Link href={href}>{children}</Link>
        return (
          <a href={href} {...(f.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : { rel: 'noopener' })}>
            {children}
          </a>
        )
      },
      blocks: {
        callout: ({ node }: any) => {
          const f = node.fields as CalloutFields
          const tone = calloutTone[f.tone ?? 'info'] ?? calloutTone.info
          const Icon = tone.icon
          return (
            <aside className={cn('not-prose my-8 flex gap-3 rounded-[var(--radius-card)] border p-5', tone.className)}>
              <Icon aria-hidden className="mt-1 size-5 shrink-0" />
              <div>
                {f.title && <p className="mb-1 font-semibold">{f.title}</p>}
                {bodyOf(f.body, converters)}
              </div>
            </aside>
          )
        },
        statWithSource: ({ node }: any) => {
          const f = node.fields as StatFields
          return (
            <figure className="not-prose my-8 rounded-[var(--radius-card)] bg-ink-950 p-6 text-sand-50">
              <p className="text-display-2 font-bold">
                <bdi className="num">{f.value}</bdi>
              </p>
              <figcaption className="mt-2 text-sand-300">
                <span>{f.label}</span>
                {f.sourceUrl && (
                  <span className="mt-2 block text-sm">
                    <SourceCite
                      label={f.sourceName ?? f.sourceLabel ?? f.sourceUrl}
                      url={f.sourceUrl}
                      date={f.checkedAt ?? f.date ?? undefined}
                      locale={locale}
                    />
                  </span>
                )}
              </figcaption>
            </figure>
          )
        },
        comparisonTable: ({ node }: any) => (
          <div className="not-prose my-8">
            <ComparisonTable data={node.fields as ComparisonTableData} sourceLabel={t('common.source')} />
          </div>
        ),
        faq: ({ node }: any) => {
          const f = node.fields as FaqFields
          const inline = (f.items ?? [])
            .filter((i) => i.question && typeof i.answer === 'string')
            .map((i) => ({ question: String(i.question), answer: String(i.answer) }))
          const linked = publicRelations((f.faqs ?? []) as any[], locale)
            .filter((q: any) => q.question && q.answer)
            .map((q: any) => ({ question: String(q.question), answer: String(q.answer) }))
          const items = [...inline, ...linked]
          if (!items.length) return null
          return (
            <div className="not-prose my-8">
              {f.title && <p className="mb-4 text-xl font-semibold">{f.title}</p>}
              <FaqList items={items} />
            </div>
          )
        },
        cta: ({ node }: any) => {
          const f = node.fields as CtaFields
          const heading = f.heading ?? f.title
          const action = f.action ?? (f.href ? 'custom' : 'scorecard')
          const href = action === 'custom' ? f.href : ctaHref[action]
          const label = f.label || t(`cta.${action === 'custom' ? 'scorecard' : action}`)
          return (
            <aside className="not-prose my-10 rounded-[var(--radius-card)] bg-sand-100 p-6 lg:p-8">
              {heading && <p className="text-display-3 font-bold">{heading}</p>}
              {f.body && <p className="mt-2 text-ink-600">{f.body}</p>}
              <div className="mt-5">
                {action === 'whatsapp' ? (
                  <WhatsAppButton message={t('cta.whatsappMessage')} placement="rich_text_cta" label={label} />
                ) : href ? (
                  <ButtonLink href={href}>{label}</ButtonLink>
                ) : null}
              </div>
            </aside>
          )
        },
        video: ({ node }: any) => {
          const f = node.fields as VideoFields
          if (!f.url) return null
          return (
            <div className="not-prose my-8">
              <VideoFacade
                url={f.url}
                title={f.title ?? ''}
                poster={mediaOf(f.posterImage)?.url}
                vertical={f.platform === 'instagram' || f.platform === 'tiktok' || /\/shorts\//.test(f.url)}
                playLabel={t('common.playVideo')}
              />
              {f.transcript && (
                <details className="mt-3 rounded-[12px] border border-sand-300 p-4">
                  <summary className="cursor-pointer font-semibold">{t('common.transcript')}</summary>
                  <p className="mt-3 whitespace-pre-line text-ink-600">{f.transcript}</p>
                </details>
              )}
            </div>
          )
        },
      },
    }
    return own
  }

  return (
    <div
      className={cn(
        'rich-text max-w-none space-y-5 text-start [&_a]:text-ignition-700 [&_a]:underline [&_h2]:mt-12 [&_h2]:text-display-3 [&_h2]:font-bold [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold [&_li]:my-1 [&_ol]:list-decimal [&_ol]:ps-6 [&_ul]:list-disc [&_ul]:ps-6 [&_blockquote]:border-s-4 [&_blockquote]:border-ignition-500 [&_blockquote]:ps-4',
        className,
      )}
    >
      <LexicalRichText data={data} converters={converters} disableContainer />
    </div>
  )
}
