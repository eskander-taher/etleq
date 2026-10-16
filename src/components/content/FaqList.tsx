import { ChevronDown } from 'lucide-react'

export type FaqItem = { question: string; answer: string }

/** Server-rendered FAQ: native <details>, so every answer is in the HTML and works without JavaScript. */
export function FaqList({ items, headingLevel = 3 }: { items: FaqItem[]; headingLevel?: 2 | 3 }) {
  if (!items.length) return null
  const H = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <div className="divide-y divide-sand-300 rounded-[var(--radius-card)] border border-sand-300 bg-white/60">
      {items.map((item, i) => (
        <details key={i} className="group px-5 py-4" open={i === 0}>
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
            <H className="text-lg font-semibold">{item.question}</H>
            <ChevronDown aria-hidden className="size-5 shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 whitespace-pre-line text-ink-600">{item.answer}</div>
        </details>
      ))}
    </div>
  )
}
