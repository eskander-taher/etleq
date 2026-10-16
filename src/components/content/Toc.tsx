import type { TocItem } from './lib'

/** Server-rendered table of contents from h2/h3 headings. Sticky beside the content on desktop. */
export function Toc({ items, title }: { items: TocItem[]; title: string }) {
  if (items.length < 2) return null
  return (
    <nav aria-label={title} className="order-first h-fit rounded-[var(--radius-card)] bg-sand-100 p-5 text-sm lg:sticky lg:top-28 lg:order-last">
      <p className="mb-3 font-semibold">{title}</p>
      <ol className="space-y-2">
        {items.map((it) => (
          <li key={it.id} className={it.level === 3 ? 'ps-4' : undefined}>
            <a href={`#${it.id}`} className="text-ink-600 hover:text-ink-950 hover:underline">
              {it.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
