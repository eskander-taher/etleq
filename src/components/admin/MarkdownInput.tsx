'use client'

import { useMemo, useRef, useState } from 'react'
import { marked } from 'marked'

/* eslint-disable @typescript-eslint/no-explicit-any -- the form edits documents of any shape */

const button =
  'rounded-md border border-sand-300 bg-white px-2.5 py-1 text-xs font-medium text-ink-800 hover:bg-sand-100 disabled:opacity-40'

/** Boxes the site renders specially inside text (fenced JSON, see src/cms/richtext.ts). */
const BOXES: { type: string; label: string; template: object }[] = [
  { type: 'callout', label: 'Note box', template: { tone: 'info', title: '', body: '' } },
  {
    type: 'statWithSource',
    label: 'Number with source',
    template: { value: '', label: '', sourceName: '', sourceUrl: 'https://', checkedAt: '2026-01-01' },
  },
  { type: 'faq', label: 'Questions', template: { title: '', items: [{ question: '', answer: '' }] } },
  { type: 'cta', label: 'Call-to-action button', template: { heading: '', body: '', action: 'scorecard', label: '' } },
  {
    type: 'video',
    label: 'Video',
    template: { url: 'https://www.youtube.com/watch?v=', platform: 'youtube', title: '', transcript: '' },
  },
]

/**
 * Plain text with light formatting (Markdown). Toolbar buttons insert the
 * syntax so nobody has to learn it; "Preview" shows how it will look.
 */
export function MarkdownInput({
  id,
  value,
  onChange,
  dir,
}: {
  id: string
  value: any
  onChange: (v: any) => void
  dir?: 'rtl' | 'ltr'
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [preview, setPreview] = useState(false)
  const text = typeof value === 'string' ? value : ''
  const ar = dir === 'rtl'

  const wrap = (before: string, after = before, placeholder = ar ? 'نص' : 'text') => {
    const el = ref.current
    const start = el?.selectionStart ?? text.length
    const end = el?.selectionEnd ?? text.length
    const selected = text.slice(start, end) || placeholder
    onChange(`${text.slice(0, start)}${before}${selected}${after}${text.slice(end)}`)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + before.length, start + before.length + selected.length)
    })
  }
  const block = (snippet: string) => {
    const el = ref.current
    const at = el?.selectionStart ?? text.length
    const head = text.slice(0, at)
    const gap = head && !head.endsWith('\n\n') ? (head.endsWith('\n') ? '\n' : '\n\n') : ''
    onChange(`${head}${gap}${snippet}\n\n${text.slice(at)}`)
  }

  const html = useMemo(() => (preview ? (marked.parse(text, { async: false }) as string) : ''), [preview, text])

  return (
    <div className="rounded-lg border border-sand-300 bg-white" dir="ltr">
      <div className="flex flex-wrap items-center gap-1 border-b border-sand-300 p-2">
        <button type="button" className={`${button} font-bold`} disabled={preview} onClick={() => wrap('**')}>
          Bold
        </button>
        <button type="button" className={button} disabled={preview} onClick={() => block(ar ? '## عنوان' : '## Heading')}>
          Heading
        </button>
        <button
          type="button"
          className={button}
          disabled={preview}
          onClick={() => block(ar ? '- نقطة\n- نقطة' : '- point\n- point')}
        >
          Bullet list
        </button>
        <button
          type="button"
          className={button}
          disabled={preview}
          onClick={() => wrap('[', '](https://)', ar ? 'نص الرابط' : 'link text')}
        >
          Link
        </button>
        <select
          className={`${button} max-w-40`}
          value=""
          disabled={preview}
          aria-label="Insert a box"
          onChange={(e) => {
            const box = BOXES.find((b) => b.type === e.target.value)
            if (box) block(`\`\`\`${box.type}\n${JSON.stringify(box.template, null, 2)}\n\`\`\``)
          }}
        >
          <option value="">Insert a box…</option>
          {BOXES.map((b) => (
            <option key={b.type} value={b.type}>
              {b.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={`${button} ms-auto`}
          aria-pressed={preview}
          onClick={() => setPreview(!preview)}
        >
          {preview ? 'Edit' : 'Preview'}
        </button>
      </div>
      {preview ? (
        <div
          dir={dir ?? 'auto'}
          className="min-h-40 px-3 py-2 text-sm leading-relaxed [&_a]:underline [&_h2]:mt-3 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:font-semibold [&_li]:ms-5 [&_ol]:list-decimal [&_p]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-sand-100 [&_pre]:p-2 [&_pre]:text-xs [&_ul]:list-disc"
          // Admin-only preview of the editor's own text.
          dangerouslySetInnerHTML={{ __html: html || '<p style="opacity:.6">Nothing written yet.</p>' }}
        />
      ) : (
        <textarea
          ref={ref}
          id={id}
          dir={dir ?? 'auto'}
          lang={ar ? 'ar' : undefined}
          rows={8}
          className="field-sizing-content min-h-40 w-full resize-y rounded-b-lg bg-white px-3 py-2 text-base leading-relaxed focus:outline-none sm:text-sm"
          value={text}
          onChange={(e) => onChange(e.target.value || null)}
        />
      )}
    </div>
  )
}
