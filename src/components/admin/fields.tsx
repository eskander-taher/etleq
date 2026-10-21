'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

import type { ArrayField, Block, Field, RelationField } from '@/cms/schema/types'

import { GalleryInput } from './GalleryInput'
import { MarkdownInput } from './MarkdownInput'
import { uploadFile } from './upload'

/* eslint-disable @typescript-eslint/no-explicit-any -- the form edits documents of any shape */
export type Doc = Record<string, any>
export type RelOption = { value: string; label: string; thumb?: string | null; alt?: { ar?: string; en?: string } }
export type RelOptions = Record<string, RelOption[]>
type Loc = 'ar' | 'en'

/** Options key for a relation field (filtered upload fields get their own list). */
export const optionsKey = (field: Pick<RelationField, 'relationTo' | 'filter'>) =>
  field.filter
    ? `${field.relationTo}?${Object.entries(field.filter)
        .map(([k, v]) => `${k}=${v}`)
        .join('&')}`
    : field.relationTo

export const newRowId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('')

export function defaultsFor(fields: Field[]): Doc {
  const out: Doc = {}
  for (const f of fields) {
    if (f.type === 'group') out[f.name] = defaultsFor(f.fields)
    else if (f.defaultValue !== undefined)
      out[f.name] = f.localized ? { ar: f.defaultValue, en: f.defaultValue } : f.defaultValue
  }
  return out
}

export const labelOf = (field: Field) =>
  field.label ?? field.name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())

/** `showIf` against the sibling values. */
export function visible(field: Field, sibling: Doc | undefined): boolean {
  const rule = field.showIf
  if (!rule) return true
  const v = sibling?.[rule.field]
  if (rule.equals !== undefined && v !== rule.equals) return false
  if (rule.notEquals !== undefined && v === rule.notEquals) return false
  return true
}

export const FormCtx = createContext<{
  options: RelOptions
  addOption: (key: string, option: RelOption) => void
  errors: Set<string>
  translated?: Doc
}>({ options: {}, addOption: () => {}, errors: new Set() })

export const inputClass =
  'w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-base text-ink-950 placeholder:text-ink-600/60 focus:border-ink-600 focus:outline-none focus:ring-2 focus:ring-ignition-500/30 disabled:bg-sand-100 disabled:text-ink-600 sm:text-sm'
export const smallButton =
  'inline-flex items-center gap-1 rounded-md border border-sand-300 bg-white px-2.5 py-1.5 text-xs font-medium text-ink-800 hover:bg-sand-100 disabled:opacity-40'
const errorRing = 'rounded-lg ring-2 ring-[#B42318] ring-offset-2'

const LANGS: { key: Loc; label: string }[] = [
  { key: 'ar', label: 'العربية' },
  { key: 'en', label: 'English' },
]

/* ------------------------------------------------------------------ */

export function FieldList({
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
  const shown = fields.filter((f) => !f.hidden && visible(f, value))
  // Inside rows and groups, technical fields fold into a small "More options".
  const nested = path !== ''
  const plain = nested ? shown.filter((f) => f.section !== 'advanced') : shown
  const extra = nested ? shown.filter((f) => f.section === 'advanced') : []
  const render = (field: Field) => (
    <FieldInput
      key={field.name}
      field={field}
      path={`${path}${field.name}`}
      value={value?.[field.name]}
      onChange={(v) => onChange({ ...(value || {}), [field.name]: v })}
    />
  )
  return (
    <>
      {plain.map(render)}
      {extra.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-xs text-ink-600">More options</summary>
          <div className="mt-3 space-y-4">{extra.map(render)}</div>
        </details>
      )}
    </>
  )
}

function Label({ field, htmlFor, children }: { field: Field; htmlFor?: string; children?: ReactNode }) {
  return (
    <div className="mb-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {htmlFor ? (
          <label className="text-sm font-semibold" htmlFor={htmlFor}>
            {labelOf(field)}
            {field.required && <span className="text-[#B42318]"> *</span>}
          </label>
        ) : (
          <span className="text-sm font-semibold">
            {labelOf(field)}
            {field.required && <span className="text-[#B42318]"> *</span>}
          </span>
        )}
        {children}
      </div>
      {field.description && <p className="mt-0.5 text-xs text-ink-600">{field.description}</p>}
    </div>
  )
}

function FieldInput({
  field,
  value,
  onChange,
  path,
}: {
  field: Field
  value: any
  onChange: (v: any) => void
  path: string
}) {
  const { errors } = useContext(FormCtx)
  const hasError = errors.has(path)

  if (field.type === 'group') {
    return (
      <fieldset
        id={`f-${path}`}
        className={`scroll-mt-28 rounded-xl border bg-white/60 p-4 ${hasError ? 'border-[#B42318]' : 'border-sand-300'}`}
      >
        <legend className="px-1 text-sm font-semibold">{labelOf(field)}</legend>
        {field.description && <p className="mb-3 text-xs text-ink-600">{field.description}</p>}
        <div className="space-y-4">
          <FieldList fields={field.fields} value={value || {}} onChange={onChange} path={`${path}.`} />
        </div>
      </fieldset>
    )
  }
  if (field.type === 'array')
    return (
      <div id={`f-${path}`} className={`scroll-mt-28 ${hasError ? errorRing : ''}`}>
        <ArrayInput field={field} value={value} onChange={onChange} path={path} />
      </div>
    )
  if (field.type === 'blocks') {
    return field.localized ? (
      <LocalizedBlocks field={field} value={value} onChange={onChange} path={path} />
    ) : (
      <BlocksInput blocks={field.blocks} label={labelOf(field)} value={value} onChange={onChange} path={path} />
    )
  }
  if (field.type === 'checkbox') {
    return (
      <div id={`f-${path}`} className={`scroll-mt-28 ${hasError ? errorRing : ''}`}>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5 size-5 shrink-0 accent-ink-950"
            checked={Boolean(value)}
            disabled={field.readOnly}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span>
            <span className="block text-sm font-semibold">{labelOf(field)}</span>
            {field.description && <span className="block text-xs text-ink-600">{field.description}</span>}
          </span>
        </label>
      </div>
    )
  }
  if (field.localized) return <LocalizedInput field={field} value={value} onChange={onChange} path={path} />

  return (
    <div id={`f-${path}`} className="scroll-mt-28">
      <Label field={field} htmlFor={field.type === 'select' && field.ui === 'radio' ? undefined : path} />
      <div className={hasError ? errorRing : ''}>
        <ScalarInput field={field} id={path} value={value} onChange={onChange} />
      </div>
    </div>
  )
}

/** Arabic and English side by side (stacked on narrow screens and in the sidebar). */
function LocalizedInput({
  field,
  value,
  onChange,
  path,
}: {
  field: Field
  value: any
  onChange: (v: any) => void
  path: string
}) {
  const { errors, translated } = useContext(FormCtx)
  const map: Doc = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const wide = field.type === 'richText'
  return (
    <div id={`f-${path}`} className="@container scroll-mt-28">
      <Label field={field} />
      <div
        className={`grid gap-3 ${wide ? '@3xl:grid-cols-2' : '@lg:grid-cols-2'} ${errors.has(path) ? errorRing : ''}`}
      >
        {LANGS.map(({ key, label }) => {
          const off = translated && translated[key] === false
          return (
            <div key={key} className={off ? 'opacity-60' : ''}>
              <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-600">
                <label htmlFor={`${path}--${key}`}>{label}</label>
                {off && <span className="font-normal normal-case">(hidden on the site)</span>}
              </div>
              <ScalarInput
                field={field}
                id={`${path}--${key}`}
                value={map[key]}
                dir={key === 'ar' ? 'rtl' : 'ltr'}
                lang={key}
                onChange={(v) => onChange({ ...map, [key]: v })}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ScalarInput({
  field,
  id,
  value,
  onChange,
  dir,
  lang,
}: {
  field: Field
  id: string
  value: any
  onChange: (v: any) => void
  dir?: 'rtl' | 'ltr'
  lang?: Loc
}) {
  const disabled = field.readOnly
  const placeholder = lang === 'ar' ? undefined : field.placeholder
  switch (field.type) {
    case 'text':
    case 'email':
      return (
        <input
          id={id}
          lang={lang}
          type={field.name === 'password' ? 'password' : field.type === 'email' ? 'email' : 'text'}
          autoComplete={field.name === 'password' ? 'new-password' : 'off'}
          dir={field.type === 'email' ? 'ltr' : (dir ?? 'auto')}
          className={inputClass}
          placeholder={placeholder}
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value || null)}
        />
      )
    case 'textarea':
      return (
        <textarea
          id={id}
          lang={lang}
          dir={dir ?? 'auto'}
          rows={3}
          className={`${inputClass} field-sizing-content min-h-20`}
          placeholder={placeholder}
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
          inputMode="numeric"
          dir="ltr"
          className={`${inputClass} max-w-48`}
          value={value ?? ''}
          min={field.min}
          max={field.max}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
      )
    case 'date': {
      const shown = typeof value === 'string' ? (field.time ? value.slice(0, 16) : value.slice(0, 10)) : ''
      return (
        <input
          id={id}
          type={field.time ? 'datetime-local' : 'date'}
          dir="ltr"
          className={`${inputClass} max-w-56`}
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
      if (field.ui === 'radio') {
        return (
          <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
            {field.options.map((o) => {
              const checked = value === o.value
              return (
                <label
                  key={o.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 bg-white px-4 py-3 text-sm font-semibold ${checked ? 'border-ink-950' : 'border-sand-300 hover:border-ink-600'}`}
                >
                  <input
                    type="radio"
                    name={id}
                    className="size-4 accent-ink-950"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => onChange(o.value)}
                  />
                  {o.label}
                </label>
              )
            })}
          </div>
        )
      }
      return (
        <select
          id={id}
          className={inputClass}
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">Choose…</option>
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
      {invalid && <p className="mt-1 text-xs text-[#B42318]">This is not valid data yet; the last valid value is kept.</p>}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Relations and uploads                                               */
/* ------------------------------------------------------------------ */

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
  const [over, setOver] = useState(false)
  const isUpload = field.type === 'upload'
  const isImage = field.relationTo === 'media'

  const upload = async (file: File) => {
    setUploading(true)
    setUploadError('')
    try {
      const up = await uploadFile(file, field.relationTo, field.filter?.purpose)
      addOption(key, { value: up.id, label: up.label, thumb: up.thumb })
      onChange(field.hasMany ? [...(Array.isArray(value) ? value : []), up.id] : up.id)
    } catch (error) {
      setUploadError((error as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const uploader = isUpload ? (
    <label className={`${smallButton} cursor-pointer whitespace-nowrap`}>
      {uploading ? 'Uploading…' : isImage ? 'Upload image' : 'Upload PDF'}
      <input
        type="file"
        className="sr-only"
        accept={isImage ? 'image/*' : 'application/pdf'}
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void upload(file)
          e.target.value = ''
        }}
      />
    </label>
  ) : null

  const dropProps = isUpload
    ? {
        onDragOver: (e: React.DragEvent) => {
          e.preventDefault()
          setOver(true)
        },
        onDragLeave: () => setOver(false),
        onDrop: (e: React.DragEvent) => {
          e.preventDefault()
          setOver(false)
          const file = e.dataTransfer.files?.[0]
          if (file) void upload(file)
        },
      }
    : {}

  if (field.hasMany) {
    const selected: string[] = Array.isArray(value) ? value.map(String) : []
    return (
      <div className="space-y-2">
        {selected.length > 0 && (
          <ul className="space-y-1">
            {selected.map((v, i) => (
              <li
                key={`${v}-${i}`}
                className="flex items-center gap-2 rounded-lg border border-sand-300 bg-white px-2 py-1.5 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">{byId.get(v)?.label ?? 'Unknown item'}</span>
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
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <select
          id={id}
          className={inputClass}
          value=""
          disabled={field.maxRows !== undefined && selected.length >= field.maxRows}
          onChange={(e) => e.target.value && onChange([...selected, e.target.value])}
        >
          <option value="">{list.length ? 'Add…' : 'Nothing to choose yet'}</option>
          {list
            .filter((o) => !selected.includes(o.value))
            .map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
        </select>
      </div>
    )
  }

  const current = value == null ? '' : String(value)
  const chosen = byId.get(current)
  return (
    <div
      {...dropProps}
      className={`space-y-2 ${isUpload ? `rounded-xl border border-dashed p-3 ${over ? 'border-ink-950 bg-sand-100' : 'border-sand-300 bg-white'}` : ''}`}
    >
      {isImage && chosen?.thumb && (
        // eslint-disable-next-line @next/next/no-img-element -- admin preview of uploaded media
        <img src={chosen.thumb} alt="" className="max-h-40 rounded-lg border border-sand-300 object-contain" />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <select
          id={id}
          className={`${inputClass} min-w-0 flex-1`}
          value={current}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">
            {isUpload ? (isImage ? 'No image (choose one already uploaded)' : 'No file') : 'None'}
          </option>
          {current && !byId.has(current) && <option value={current}>Unknown item</option>}
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
      {isUpload && <p className="text-xs text-ink-600">Or drag a file here.</p>}
      {uploadError && <p className="text-xs text-[#B42318]">{uploadError}</p>}
    </div>
  )
}

export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/* ------------------------------------------------------------------ */
/* Arrays                                                              */
/* ------------------------------------------------------------------ */

/** A row's heading: its first translated text, else its first short plain text. */
function rowTitle(row: Doc): string {
  const values = Object.entries(row || {})
    .filter(([k]) => k !== 'id')
    .map(([, v]) => v)
  for (const v of values) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const t = v.ar || v.en
      if (typeof t === 'string' && t) return t
    }
  }
  for (const v of values) if (typeof v === 'string' && v && v.length < 80 && !/^[0-9a-f]{24}$/.test(v)) return v
  return ''
}

function RowControls({
  index,
  count,
  onMove,
  onRemove,
}: {
  index: number
  count: number
  onMove: (to: number) => void
  onRemove: () => void
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
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
  )
}

function RowShell({
  title,
  startOpen,
  controls,
  children,
}: {
  title: string
  startOpen: boolean
  controls: ReactNode
  children: ReactNode
}) {
  const [open, setOpen] = useState(startOpen)
  return (
    <div className="rounded-lg border border-sand-300 bg-white">
      <div className="flex items-center gap-2 border-b border-sand-300 px-3 py-2">
        <button
          type="button"
          className="min-w-0 flex-1 truncate text-start text-sm font-medium"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          {open ? '▾' : '▸'} {title}
        </button>
        {controls}
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
  field: ArrayField
  value: any
  onChange: (v: any) => void
  path: string
}) {
  const rows: Doc[] = Array.isArray(value) ? value : []
  const full = field.maxRows !== undefined && rows.length >= field.maxRows
  const noun = field.rowLabel ?? 'item'
  const add = () => onChange([...rows, { id: newRowId(), ...defaultsFor(field.fields) }])

  if (field.ui === 'tags') return <TagsInput field={field} rows={rows} onChange={onChange} path={path} />
  if (field.ui === 'gallery')
    return (
      <div>
        <Label field={field} />
        <GalleryInput field={field} rows={rows} onChange={onChange} />
      </div>
    )

  const addButton = (
    <button type="button" className={smallButton} disabled={full} onClick={add}>
      + Add {rows.length ? 'another ' : ''}
      {noun}
    </button>
  )

  if (field.ui === 'inline') {
    return (
      <fieldset className="@container">
        <legend className="contents">
          <Label field={field} />
        </legend>
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div
              key={row?.id ?? i}
              data-path={`${path}.${i}`}
              className="flex items-start gap-2 rounded-lg border border-sand-300 bg-white p-2"
            >
              <div className="grid min-w-0 flex-1 gap-3 @xl:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
                <FieldList
                  fields={field.fields}
                  value={row}
                  onChange={(r) => onChange(rows.map((x, j) => (j === i ? r : x)))}
                  path={`${path}.${i}.`}
                />
              </div>
              <RowControls
                index={i}
                count={rows.length}
                onMove={(to) => onChange(move(rows, i, to))}
                onRemove={() => onChange(rows.filter((_, j) => j !== i))}
              />
            </div>
          ))}
          {addButton}
        </div>
      </fieldset>
    )
  }

  return (
    <fieldset className="space-y-2">
      <legend className="contents">
        <Label field={field} />
      </legend>
      {rows.map((row, i) => (
        <div key={row?.id ?? i} data-path={`${path}.${i}`}>
          <RowShell
            title={`${i + 1}. ${rowTitle(row) || `New ${noun}`}`}
            startOpen={rows.length <= 3 || !rowTitle(row)}
            controls={
              <RowControls
                index={i}
                count={rows.length}
                onMove={(to) => onChange(move(rows, i, to))}
                onRemove={() => onChange(rows.filter((_, j) => j !== i))}
              />
            }
          >
            <FieldList
              fields={field.fields}
              value={row}
              onChange={(r) => onChange(rows.map((x, j) => (j === i ? r : x)))}
              path={`${path}.${i}.`}
            />
          </RowShell>
        </div>
      ))}
      {addButton}
    </fieldset>
  )
}

/** Chips for an array of `{ <one text field> }`, e.g. the stack. */
function TagsInput({
  field,
  rows,
  onChange,
  path,
}: {
  field: ArrayField
  rows: Doc[]
  onChange: (v: Doc[]) => void
  path: string
}) {
  const sub = field.fields[0]?.name ?? 'name'
  const [draft, setDraft] = useState('')
  const commit = (raw: string) => {
    const names = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const existing = new Set(rows.map((r) => String(r?.[sub] ?? '').toLowerCase()))
    const added = names.filter((n) => !existing.has(n.toLowerCase())).map((n) => ({ id: newRowId(), [sub]: n }))
    if (added.length) onChange([...rows, ...added])
    setDraft('')
  }
  return (
    <div>
      <Label field={field} htmlFor={path} />
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-sand-300 bg-white p-2 focus-within:border-ink-600">
        {rows.map((row, i) => (
          <span
            key={row?.id ?? i}
            className="inline-flex items-center gap-1 rounded-full bg-sand-100 py-1 pe-1 ps-3 text-sm ring-1 ring-sand-300"
          >
            <bdi>{row?.[sub]}</bdi>
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, j) => j !== i))}
              className="rounded-full px-1.5 text-ink-600 hover:bg-sand-300"
              aria-label={`Remove ${row?.[sub]}`}
            >
              ✕
            </button>
          </span>
        ))}
        <input
          id={path}
          dir="ltr"
          className="min-w-32 flex-1 bg-transparent px-1 py-1 text-base focus:outline-none sm:text-sm"
          placeholder={rows.length ? 'Add another…' : 'e.g. Flutter'}
          value={draft}
          onChange={(e) => {
            if (e.target.value.endsWith(',')) commit(e.target.value)
            else setDraft(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit(draft)
            } else if (e.key === 'Backspace' && !draft && rows.length) {
              onChange(rows.slice(0, -1))
            }
          }}
          onBlur={() => draft && commit(draft)}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Blocks                                                              */
/* ------------------------------------------------------------------ */

function LocalizedBlocks({
  field,
  value,
  onChange,
  path,
}: {
  field: Extract<Field, { type: 'blocks' }>
  value: any
  onChange: (v: any) => void
  path: string
}) {
  const [locale, setLocale] = useState<Loc>('ar')
  const map: Doc = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return (
    <div id={`f-${path}`} className="scroll-mt-28 space-y-2">
      <Label field={field}>
        <span className="inline-flex overflow-hidden rounded-lg border border-sand-300 bg-white text-xs" role="group">
          {LANGS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setLocale(key)}
              aria-pressed={locale === key}
              className={`px-2.5 py-1 font-medium ${locale === key ? 'bg-ink-950 text-sand-50' : 'hover:bg-sand-100'}`}
            >
              {label}
            </button>
          ))}
        </span>
      </Label>
      <div dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <BlocksInput
          key={locale}
          blocks={field.blocks}
          label=""
          value={map[locale]}
          onChange={(v) => onChange({ ...map, [locale]: v })}
          path={path}
        />
      </div>
    </div>
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
    <fieldset className="space-y-2" dir="ltr">
      {label && <legend className="text-sm font-semibold">{label}</legend>}
      {list.map((b, i) => {
        const block = blocks.find((x) => x.slug === b?.blockType)
        return (
          <RowShell
            key={b?.id ?? i}
            title={`${i + 1}. ${block?.label ?? b?.blockType}${b?.heading ? ` — ${b.heading}` : ''}`}
            startOpen={list.length <= 2}
            controls={
              <RowControls
                index={i}
                count={list.length}
                onMove={(to) => onChange(move(list, i, to))}
                onRemove={() => onChange(list.filter((_, j) => j !== i))}
              />
            }
          >
            {block ? (
              <FieldList
                fields={block.fields}
                value={b}
                onChange={(next) => onChange(list.map((x, j) => (j === i ? next : x)))}
                path={`${path}.${i}.`}
              />
            ) : (
              <p className="text-sm text-ink-600">Unknown section type.</p>
            )}
          </RowShell>
        )
      })}
      <div className="flex flex-wrap items-center gap-2">
        <select
          className={`${inputClass} max-w-xs`}
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          aria-label="Section type"
        >
          <option value="">Choose a section…</option>
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
          + Add section
        </button>
      </div>
    </fieldset>
  )
}
