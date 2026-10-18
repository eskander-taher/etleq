'use client'

import { createContext, useContext, useMemo, useRef, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'

import { saveDocument, saveGlobal, type SaveResult } from '@/app/admin/actions'
import type { Block, Field, RelationField } from '@/cms/schema/types'

/* eslint-disable @typescript-eslint/no-explicit-any -- the form edits documents of any shape */
type Doc = Record<string, any>
export type RelOption = { value: string; label: string; thumb?: string | null }
export type RelOptions = Record<string, RelOption[]>
type Loc = 'ar' | 'en'

/** Options key for a relation field (filtered upload fields get their own list). */
export const optionsKey = (field: Pick<RelationField, 'relationTo' | 'filter'>) =>
  field.filter
    ? `${field.relationTo}?${Object.entries(field.filter)
        .map(([k, v]) => `${k}=${v}`)
        .join('&')}`
    : field.relationTo

const newRowId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('')

function defaultsFor(fields: Field[]): Doc {
  const out: Doc = {}
  for (const f of fields) {
    if (f.type === 'group') out[f.name] = defaultsFor(f.fields)
    else if (f.defaultValue !== undefined)
      out[f.name] = f.localized ? { ar: f.defaultValue, en: f.defaultValue } : f.defaultValue
  }
  return out
}

const FormCtx = createContext<{
  locale: Loc
  options: RelOptions
  addOption: (key: string, option: RelOption) => void
  errors: Set<string>
}>({
  locale: 'ar',
  options: {},
  addOption: () => {},
  errors: new Set(),
})

const inputClass =
  'w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm text-ink-950 focus:border-ink-600 focus:outline-none disabled:bg-sand-100 disabled:text-ink-600'
const smallButton =
  'rounded-md border border-sand-300 bg-white px-2 py-1 text-xs font-medium text-ink-800 hover:bg-sand-100 disabled:opacity-40'

const labelOf = (field: Field) =>
  field.label ?? field.name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())

/* ------------------------------------------------------------------ */
/* Form                                                                */
/* ------------------------------------------------------------------ */

export function DocumentForm({
  target,
  fields,
  initial,
  options: initialOptions,
  drafts,
  viewUrls,
  extraActions,
}: {
  target: { kind: 'collection'; slug: string; id: string | null } | { kind: 'global'; slug: string }
  fields: Field[]
  initial: Doc
  options: RelOptions
  drafts?: boolean
  viewUrls?: { ar?: string; en?: string }
  extraActions?: ReactNode
}) {
  const router = useRouter()
  const [doc, setDoc] = useState<Doc>(() =>
    target.kind === 'collection' && !target.id ? { ...defaultsFor(fields), ...initial } : initial,
  )
  const [locale, setLocale] = useState<Loc>('ar')
  const [options, setOptions] = useState(initialOptions)
  const [result, setResult] = useState<SaveResult | null>(null)
  const [dirty, setDirty] = useState(false)
  const [pending, startTransition] = useTransition()

  const errors = useMemo(() => new Set(result && !result.ok ? result.errors.map((e) => e.path) : []), [result])
  const ctx = useMemo(
    () => ({
      locale,
      options,
      errors,
      addOption: (key: string, option: RelOption) => setOptions((o) => ({ ...o, [key]: [option, ...(o[key] ?? [])] })),
    }),
    [locale, options, errors],
  )

  const update = (next: Doc) => {
    setDoc(next)
    setDirty(true)
  }

  const save = (status?: 'draft' | 'published') => {
    const data = status ? { ...doc, _status: status } : doc
    startTransition(async () => {
      const res =
        target.kind === 'global'
          ? await saveGlobal(target.slug, JSON.stringify(data))
          : await saveDocument(target.slug, target.id, JSON.stringify(data))
      setResult(res)
      if (!res.ok) return
      setDirty(false)
      if (status) setDoc(data)
      if (target.kind === 'collection' && !target.id) router.replace(`/admin/collections/${target.slug}/${res.id}`)
      else router.refresh()
    })
  }

  const main = fields.filter((f) => !f.sidebar && !f.hidden)
  const side = fields.filter((f) => f.sidebar && !f.hidden)
  const status = doc._status === 'published' ? 'published' : 'draft'

  return (
    <FormCtx.Provider value={ctx}>
      <div className="sticky top-0 z-10 -mx-6 mb-6 flex flex-wrap items-center gap-3 border-b border-sand-300 bg-sand-50/95 px-6 py-3 backdrop-blur">
        <div
          className="inline-flex overflow-hidden rounded-lg border border-sand-300 bg-white text-sm"
          role="group"
          aria-label="Editing language"
        >
          {(['ar', 'en'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLocale(l)}
              aria-pressed={locale === l}
              className={`px-3 py-1.5 font-medium ${locale === l ? 'bg-ink-950 text-sand-50' : 'text-ink-800 hover:bg-sand-100'}`}
            >
              {l === 'ar' ? 'العربية' : 'English'}
            </button>
          ))}
        </div>
        {drafts && (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status === 'published' ? 'bg-verified-600 text-white' : 'bg-sand-300 text-ink-800'}`}
          >
            {status === 'published' ? 'Published' : 'Draft'}
          </span>
        )}
        {dirty && <span className="text-xs text-ink-600">Unsaved changes</span>}
        {result?.ok && !dirty && <span className="text-xs font-medium text-verified-600">Saved</span>}
        <div className="ms-auto flex flex-wrap items-center gap-2">
          {viewUrls?.ar && (
            <a href={viewUrls.ar} target="_blank" rel="noreferrer" className={smallButton}>
              View AR
            </a>
          )}
          {viewUrls?.en && (
            <a href={viewUrls.en} target="_blank" rel="noreferrer" className={smallButton}>
              View EN
            </a>
          )}
          {extraActions}
          {drafts ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => save('draft')}
                className="rounded-lg border border-ink-950 px-4 py-2 text-sm font-semibold hover:bg-ink-950 hover:text-sand-50 disabled:opacity-50"
              >
                {status === 'published' ? 'Unpublish' : 'Save draft'}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => save('published')}
                className="rounded-lg bg-ignition-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-[#ff7343] disabled:opacity-50"
              >
                {status === 'published' ? 'Save & keep published' : 'Publish'}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => save()}
              className="rounded-lg bg-ignition-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-[#ff7343] disabled:opacity-50"
            >
              {pending ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </div>

      {result && !result.ok && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-[#B42318]/40 bg-[#B42318]/5 p-4 text-sm text-[#B42318]"
        >
          <p className="font-semibold">Not saved:</p>
          <ul className="mt-2 list-disc space-y-1 ps-5">
            {result.errors.map((e, i) => (
              <li key={i}>
                {e.path && <code className="me-1 font-mono text-xs">{e.path}</code>}
                {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <FieldList fields={main} value={doc} onChange={update} path="" />
        </div>
        <aside className="space-y-5 lg:border-s lg:border-sand-300 lg:ps-6">
          <FieldList fields={side} value={doc} onChange={update} path="" />
        </aside>
      </div>
    </FormCtx.Provider>
  )
}

/* ------------------------------------------------------------------ */
/* Fields                                                              */
/* ------------------------------------------------------------------ */

function FieldList({
  fields,
  value,
  onChange,
  path,
}: {
  fields: Field[]
  value: Doc
  onChange: (v: Doc) => void
  path: string
}) {
  return (
    <>
      {fields
        .filter((f) => !f.hidden)
        .map((field) => (
          <FieldInput
            key={field.name}
            field={field}
            path={`${path}${field.name}`}
            value={value?.[field.name]}
            sibling={value}
            onChange={(v) => onChange({ ...(value || {}), [field.name]: v })}
          />
        ))}
    </>
  )
}

function FieldInput({
  field,
  value,
  onChange,
  path,
  sibling,
}: {
  field: Field
  value: any
  onChange: (v: any) => void
  path: string
  sibling?: Doc
}) {
  const { locale, errors } = useContext(FormCtx)
  const hasError = errors.has(path) || errors.has(field.name)

  if (field.type === 'group') {
    return (
      <fieldset className={`rounded-xl border p-4 ${hasError ? 'border-[#B42318]' : 'border-sand-300'}`}>
        <legend className="px-1 text-sm font-semibold">{labelOf(field)}</legend>
        {field.description && <p className="mb-3 text-xs text-ink-600">{field.description}</p>}
        <div className="space-y-4">
          <FieldList fields={field.fields} value={value || {}} onChange={onChange} path={`${path}.`} />
        </div>
      </fieldset>
    )
  }
  if (field.type === 'array') return <ArrayInput field={field} value={value} onChange={onChange} path={path} />
  if (field.type === 'blocks' && !field.localized)
    return <BlocksInput blocks={field.blocks} label={labelOf(field)} value={value} onChange={onChange} path={path} />

  const localized = Boolean(field.localized)
  const current = localized
    ? value && typeof value === 'object' && !Array.isArray(value)
      ? value[locale]
      : undefined
    : value
  const set = (v: any) =>
    onChange(localized ? { ...(value && typeof value === 'object' ? value : {}), [locale]: v } : v)
  const dir = localized ? (locale === 'ar' ? 'rtl' : 'ltr') : undefined

  if (field.type === 'blocks') {
    return (
      <BlocksInput
        blocks={field.blocks}
        label={`${labelOf(field)} (${locale.toUpperCase()})`}
        value={current}
        onChange={set}
        path={path}
      />
    )
  }

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <label className="text-sm font-semibold" htmlFor={path}>
          {labelOf(field)}
          {field.required && <span className="text-[#B42318]"> *</span>}
        </label>
        {localized && (
          <span className="rounded bg-sand-300 px-1.5 text-[10px] font-bold uppercase text-ink-800">{locale}</span>
        )}
      </div>
      <div className={hasError ? 'rounded-lg ring-2 ring-[#B42318]' : ''}>
        <ScalarInput field={field} id={path} value={current} onChange={set} dir={dir} sibling={sibling} />
      </div>
      {field.description && <p className="mt-1 text-xs text-ink-600">{field.description}</p>}
    </div>
  )
}

function ScalarInput({
  field,
  id,
  value,
  onChange,
  dir,
}: {
  field: Field
  id: string
  value: any
  onChange: (v: any) => void
  dir?: 'rtl' | 'ltr'
  sibling?: Doc
}) {
  const disabled = field.readOnly
  switch (field.type) {
    case 'text':
    case 'email':
      return (
        <input
          id={id}
          type={field.name === 'password' ? 'password' : field.type === 'email' ? 'email' : 'text'}
          autoComplete={field.name === 'password' ? 'new-password' : 'off'}
          dir={field.type === 'email' ? 'ltr' : (dir ?? 'auto')}
          className={inputClass}
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value || null)}
        />
      )
    case 'textarea':
      return (
        <textarea
          id={id}
          dir={dir ?? 'auto'}
          rows={4}
          className={inputClass}
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value || null)}
        />
      )
    case 'number':
      return (
        <input
          id={id}
          type="number"
          dir="ltr"
          className={inputClass}
          value={value ?? ''}
          min={field.min}
          max={field.max}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
      )
    case 'checkbox':
      return (
        <input
          id={id}
          type="checkbox"
          className="size-5 accent-ink-950"
          checked={Boolean(value)}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
      )
    case 'date': {
      const shown = typeof value === 'string' ? (field.time ? value.slice(0, 16) : value.slice(0, 10)) : ''
      return (
        <input
          id={id}
          type={field.time ? 'datetime-local' : 'date'}
          dir="ltr"
          className={inputClass}
          value={shown}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value
            if (!v) return onChange(null)
            onChange(field.time ? new Date(v).toISOString() : `${v}T00:00:00.000Z`)
          }}
        />
      )
    }
    case 'select':
      return (
        <select
          id={id}
          className={inputClass}
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">—</option>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )
    case 'json':
      return <JsonInput id={id} value={value} onChange={onChange} disabled={disabled} />
    case 'richText':
      return <MarkdownInput id={id} value={value} onChange={onChange} dir={dir} />
    case 'relationship':
    case 'upload':
      return <RelationInput field={field} id={id} value={value} onChange={onChange} />
    default:
      return null
  }
}

function JsonInput({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string
  value: any
  onChange: (v: any) => void
  disabled?: boolean
}) {
  const [text, setText] = useState(() => (value == null ? '' : JSON.stringify(value, null, 2)))
  const [invalid, setInvalid] = useState(false)
  return (
    <>
      <textarea
        id={id}
        dir="ltr"
        rows={Math.min(14, Math.max(3, text.split('\n').length))}
        className={`${inputClass} font-mono text-xs`}
        value={text}
        disabled={disabled}
        onChange={(e) => {
          setText(e.target.value)
          if (!e.target.value.trim()) {
            setInvalid(false)
            return onChange(null)
          }
          try {
            onChange(JSON.parse(e.target.value))
            setInvalid(false)
          } catch {
            setInvalid(true)
          }
        }}
      />
      {invalid && <p className="mt-1 text-xs text-[#B42318]">Invalid JSON; the last valid value is kept.</p>}
    </>
  )
}

const BLOCK_TEMPLATES: Record<string, object> = {
  callout: { tone: 'info', title: '', body: '' },
  statWithSource: { value: '', label: '', sourceName: '', sourceUrl: 'https://', checkedAt: '2026-01-01' },
  faq: { title: '', items: [{ question: '', answer: '' }] },
  cta: { heading: '', body: '', action: 'scorecard', label: '' },
  video: { url: 'https://www.youtube.com/watch?v=', platform: 'youtube', title: '', transcript: '' },
}

function MarkdownInput({
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
  const text = typeof value === 'string' ? value : ''
  const insert = (snippet: string) => {
    const el = ref.current
    const at = el ? el.selectionStart : text.length
    const next = `${text.slice(0, at)}${at && !text.slice(0, at).endsWith('\n\n') ? '\n\n' : ''}${snippet}\n\n${text.slice(at)}`
    onChange(next)
  }
  return (
    <div className="rounded-lg border border-sand-300 bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-sand-300 p-2">
        <span className="me-1 text-xs text-ink-600">Insert:</span>
        <button type="button" className={smallButton} onClick={() => insert('## Heading')}>
          H2
        </button>
        <button type="button" className={smallButton} onClick={() => insert('- item\n- item')}>
          List
        </button>
        <button
          type="button"
          className={smallButton}
          onClick={() => insert('| | Column A | Column B |\n|---|---|---|\n| Row | value | value |')}
        >
          Table
        </button>
        {Object.entries(BLOCK_TEMPLATES).map(([type, tpl]) => (
          <button
            key={type}
            type="button"
            className={smallButton}
            onClick={() => insert(`\`\`\`${type}\n${JSON.stringify(tpl, null, 2)}\n\`\`\``)}
          >
            {type}
          </button>
        ))}
      </div>
      <textarea
        ref={ref}
        id={id}
        dir={dir ?? 'auto'}
        rows={16}
        className="w-full resize-y rounded-b-lg bg-white px-3 py-2 font-mono text-sm leading-relaxed focus:outline-none"
        value={text}
        onChange={(e) => onChange(e.target.value || null)}
      />
      <p className="border-t border-sand-300 px-3 py-1.5 text-xs text-ink-600">
        Markdown: <code>## heading</code>, <code>**bold**</code>, <code>[link](https://…)</code>, lists, tables. Blocks
        are fenced JSON (use the buttons).
      </p>
    </div>
  )
}

function RelationInput({
  field,
  id,
  value,
  onChange,
}: {
  field: RelationField
  id: string
  value: any
  onChange: (v: any) => void
}) {
  const { options, addOption } = useContext(FormCtx)
  const key = optionsKey(field)
  const list = options[key] ?? []
  const byId = new Map(list.map((o) => [o.value, o]))
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const upload = async (file: File) => {
    setUploading(true)
    setUploadError('')
    const body = new FormData()
    body.set('file', file)
    body.set('collection', field.relationTo)
    if (field.filter?.purpose) body.set('purpose', field.filter.purpose)
    try {
      const res = await fetch('/admin/upload', { method: 'POST', body })
      const json = (await res.json()) as { id?: string; label?: string; thumb?: string; error?: string }
      if (!res.ok || !json.id) throw new Error(json.error || 'Upload failed.')
      const option = { value: json.id, label: json.label || file.name, thumb: json.thumb }
      addOption(key, option)
      onChange(field.hasMany ? [...(Array.isArray(value) ? value : []), json.id] : json.id)
    } catch (error) {
      setUploadError((error as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const uploader =
    field.type === 'upload' ? (
      <label className={`${smallButton} cursor-pointer`}>
        {uploading ? 'Uploading…' : 'Upload new'}
        <input
          type="file"
          className="sr-only"
          accept={field.relationTo === 'media' ? 'image/*' : 'application/pdf'}
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void upload(file)
            e.target.value = ''
          }}
        />
      </label>
    ) : null

  const thumb = (option?: RelOption) =>
    option?.thumb ? (
      // eslint-disable-next-line @next/next/no-img-element -- admin preview of uploaded media
      <img src={option.thumb} alt="" className="size-10 rounded object-cover" />
    ) : null

  if (field.hasMany) {
    const selected: string[] = Array.isArray(value) ? value.map(String) : []
    return (
      <div className="space-y-2">
        {selected.length > 0 && (
          <ul className="space-y-1">
            {selected.map((v, i) => (
              <li
                key={`${v}-${i}`}
                className="flex items-center gap-2 rounded-lg border border-sand-300 bg-white px-2 py-1 text-sm"
              >
                {thumb(byId.get(v))}
                <span className="flex-1 truncate">{byId.get(v)?.label ?? v}</span>
                <button
                  type="button"
                  className={smallButton}
                  disabled={i === 0}
                  onClick={() => onChange(move(selected, i, i - 1))}
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={smallButton}
                  onClick={() => onChange(selected.filter((_, j) => j !== i))}
                  aria-label="Remove"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-2">
          <select
            id={id}
            className={inputClass}
            value=""
            disabled={field.maxRows !== undefined && selected.length >= field.maxRows}
            onChange={(e) => e.target.value && onChange([...selected, e.target.value])}
          >
            <option value="">Add…</option>
            {list
              .filter((o) => !selected.includes(o.value))
              .map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
          </select>
          {uploader}
        </div>
        {uploadError && <p className="text-xs text-[#B42318]">{uploadError}</p>}
      </div>
    )
  }

  const current = value == null ? '' : String(value)
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {thumb(byId.get(current))}
        <select id={id} className={inputClass} value={current} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">—</option>
          {current && !byId.has(current) && <option value={current}>{current}</option>}
          {list.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {uploader}
        {current && field.relationTo === 'private-files' && (
          <a className={smallButton} href={`/admin/files/${current}`} target="_blank" rel="noreferrer">
            Open
          </a>
        )}
      </div>
      {uploadError && <p className="text-xs text-[#B42318]">{uploadError}</p>}
    </div>
  )
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

function rowTitle(row: Doc, locale: Loc): string {
  for (const v of Object.values(row || {})) {
    if (typeof v === 'string' && v && v.length < 80 && !/^[0-9a-f]{24}$/.test(v)) return v
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof v[locale] === 'string' && v[locale]) return v[locale]
  }
  return ''
}

function RowShell({
  title,
  index,
  count,
  onMove,
  onRemove,
  children,
}: {
  title: string
  index: number
  count: number
  onMove: (to: number) => void
  onRemove: () => void
  children: ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-lg border border-sand-300 bg-white">
      <div className="flex items-center gap-2 border-b border-sand-300 px-3 py-2">
        <button
          type="button"
          className="flex-1 truncate text-start text-sm font-medium"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          {open ? '▾' : '▸'} {title}
        </button>
        <button
          type="button"
          className={smallButton}
          disabled={index === 0}
          onClick={() => onMove(index - 1)}
          aria-label="Move up"
        >
          ↑
        </button>
        <button
          type="button"
          className={smallButton}
          disabled={index === count - 1}
          onClick={() => onMove(index + 1)}
          aria-label="Move down"
        >
          ↓
        </button>
        <button type="button" className={smallButton} onClick={onRemove} aria-label="Remove">
          ✕
        </button>
      </div>
      {open && <div className="space-y-4 p-3">{children}</div>}
    </div>
  )
}

function ArrayInput({
  field,
  value,
  onChange,
  path,
}: {
  field: Extract<Field, { type: 'array' }>
  value: any
  onChange: (v: any) => void
  path: string
}) {
  const { locale } = useContext(FormCtx)
  const rows: Doc[] = Array.isArray(value) ? value : []
  const full = field.maxRows !== undefined && rows.length >= field.maxRows
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold">{labelOf(field)}</legend>
      {field.description && <p className="text-xs text-ink-600">{field.description}</p>}
      {rows.map((row, i) => (
        <RowShell
          key={row?.id ?? i}
          title={`${i + 1}. ${rowTitle(row, locale)}`}
          index={i}
          count={rows.length}
          onMove={(to) => onChange(move(rows, i, to))}
          onRemove={() => onChange(rows.filter((_, j) => j !== i))}
        >
          <FieldList
            fields={field.fields}
            value={row}
            onChange={(r) => onChange(rows.map((x, j) => (j === i ? r : x)))}
            path={`${path}.${i}.`}
          />
        </RowShell>
      ))}
      <button
        type="button"
        className={smallButton}
        disabled={full}
        onClick={() => onChange([...rows, { id: newRowId(), ...defaultsFor(field.fields) }])}
      >
        + Add {labelOf(field).toLowerCase()}
      </button>
    </fieldset>
  )
}

function BlocksInput({
  blocks,
  label,
  value,
  onChange,
  path,
}: {
  blocks: Block[]
  label: string
  value: any
  onChange: (v: any) => void
  path: string
}) {
  const list: Doc[] = Array.isArray(value) ? value : []
  const [adding, setAdding] = useState('')
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold">{label}</legend>
      {list.map((b, i) => {
        const block = blocks.find((x) => x.slug === b?.blockType)
        return (
          <RowShell
            key={b?.id ?? i}
            title={`${i + 1}. ${block?.label ?? b?.blockType}${b?.heading ? ` — ${b.heading}` : ''}`}
            index={i}
            count={list.length}
            onMove={(to) => onChange(move(list, i, to))}
            onRemove={() => onChange(list.filter((_, j) => j !== i))}
          >
            {block ? (
              <FieldList
                fields={block.fields}
                value={b}
                onChange={(next) => onChange(list.map((x, j) => (j === i ? next : x)))}
                path={`${path}.${i}.`}
              />
            ) : (
              <p className="text-sm text-ink-600">Unknown block type.</p>
            )}
          </RowShell>
        )
      })}
      <div className="flex items-center gap-2">
        <select
          className={`${inputClass} max-w-xs`}
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          aria-label="Block type"
        >
          <option value="">Choose a block…</option>
          {blocks.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={smallButton}
          disabled={!adding}
          onClick={() => {
            const block = blocks.find((x) => x.slug === adding)
            if (!block) return
            onChange([...list, { id: newRowId(), blockType: block.slug, ...defaultsFor(block.fields) }])
            setAdding('')
          }}
        >
          + Add block
        </button>
      </div>
    </fieldset>
  )
}
