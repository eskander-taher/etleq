'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'

import { saveDocument, saveGlobal, type SaveResult } from '@/app/admin/actions'
import type { Field } from '@/cms/schema/types'

import { type Doc, defaultsFor, FieldList, FormCtx, labelOf, type RelOption, type RelOptions, visible } from './fields'

export { optionsKey, type RelOption, type RelOptions } from './fields'

type Problem = { path: string; message: string }
type Section = 'more' | 'advanced'

const TOAST_KEY = 'etleq-admin-toast'

/** "results.0.label" → label chain from the schema, for the error list. */
function pathLabel(fields: Field[], path: string): string {
  const parts: string[] = []
  let current: Field[] = fields
  for (const seg of path.split('.')) {
    if (/^\d+$/.test(seg)) {
      parts.push(`#${Number(seg) + 1}`)
      continue
    }
    const field = current.find((f) => f.name === seg)
    if (!field) break
    parts.push(labelOf(field))
    current = field.type === 'group' || field.type === 'array' ? field.fields : []
  }
  return parts.join(' › ')
}

export function DocumentForm({
  target,
  fields,
  initial,
  options: initialOptions,
  drafts,
  viewUrls,
  extraActions,
  singular,
}: {
  target: { kind: 'collection'; slug: string; id: string | null } | { kind: 'global'; slug: string }
  fields: Field[]
  initial: Doc
  options: RelOptions
  drafts?: boolean
  viewUrls?: { ar?: string; en?: string }
  extraActions?: ReactNode
  /** e.g. "project", for button and toast wording. */
  singular?: string
}) {
  const router = useRouter()
  const isNew = target.kind === 'collection' && !target.id
  const [doc, setDoc] = useState<Doc>(() => (isNew ? { ...defaultsFor(fields), ...initial } : initial))
  const [options, setOptions] = useState(initialOptions)
  const [problems, setProblems] = useState<{ publishing: boolean; list: Problem[] } | null>(null)
  const [dirty, setDirty] = useState(false)
  const [toast, setToast] = useState<{ text: string; tone: 'ok' | 'info' } | null>(null)
  const [open, setOpen] = useState<Record<Section, boolean>>({ more: false, advanced: false })
  const [pending, startTransition] = useTransition()
  const errorBox = useRef<HTMLDivElement>(null)

  const errors = useMemo(() => new Set(problems?.list.map((p) => p.path) ?? []), [problems])
  const addOption = useCallback(
    (key: string, option: RelOption) => setOptions((o) => ({ ...o, [key]: [option, ...(o[key] ?? [])] })),
    [],
  )
  const ctx = useMemo(
    () => ({ options, addOption, errors, translated: doc.translated as Doc | undefined }),
    [options, addOption, errors, doc.translated],
  )

  // A toast left by the previous page (after creating a document the URL changes).
  useEffect(() => {
    let saved: string | null = null
    try {
      saved = sessionStorage.getItem(TOAST_KEY)
      if (saved) sessionStorage.removeItem(TOAST_KEY)
    } catch {
      /* storage unavailable */
    }
    if (!saved) return
    // Not cleared on cleanup: in development effects run twice and the message is read only once.
    setTimeout(() => setToast({ text: saved, tone: 'ok' }), 0)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  // Unsaved-changes guard: closing the tab, reloading, or clicking an admin link.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank' || e.defaultPrevented) return
      if (!window.confirm('You have unsaved changes. Leave without saving?')) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClick, true)
    }
  }, [dirty])

  const update = (next: Doc) => {
    setDoc(next)
    setDirty(true)
  }

  const sectionOf = (path: string): Section | undefined =>
    fields.find((f) => f.name === path.split('.')[0])?.section

  const goTo = (path: string) => {
    const section = sectionOf(path)
    if (section) setOpen((o) => ({ ...o, [section]: true }))
    setTimeout(() => {
      const el =
        document.getElementById(`f-${path}`) ??
        document.getElementById(`f-${path.split('.')[0]}`) ??
        document.querySelector<HTMLElement>(`[data-path="${CSS.escape(path)}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const input = el?.querySelector<HTMLElement>('input, textarea, select, button') ?? el
      input?.focus?.({ preventScroll: true })
    }, 50)
  }

  const save = (status?: 'draft' | 'published') => {
    const data = status ? { ...doc, _status: status } : doc
    const publishing = status === 'published'
    startTransition(async () => {
      const res: SaveResult =
        target.kind === 'global'
          ? await saveGlobal(target.slug, JSON.stringify(data))
          : await saveDocument(target.slug, target.id, JSON.stringify(data))
      if (!res.ok) {
        setProblems({ publishing, list: res.errors })
        // Open collapsed sections that contain a problem, then show the list.
        const sections = new Set(res.errors.map((e) => sectionOf(e.path)).filter(Boolean) as Section[])
        if (sections.size) setOpen((o) => ({ ...o, ...Object.fromEntries([...sections].map((s) => [s, true])) }))
        setTimeout(() => errorBox.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
        return
      }
      setProblems(null)
      setDirty(false)
      if (status) setDoc(data)
      const text =
        status === 'published'
          ? doc._status === 'published'
            ? 'Changes saved. They are live on the site.'
            : 'Published. It is live on the site now.'
          : status === 'draft'
            ? doc._status === 'published'
              ? 'Unpublished. It is hidden from the site.'
              : 'Draft saved. It is not on the site yet.'
            : 'Saved.'
      if (isNew && target.kind === 'collection') {
        try {
          sessionStorage.setItem(TOAST_KEY, text)
        } catch {
          /* storage unavailable */
        }
        router.replace(`/admin/collections/${target.slug}/${res.id}`)
      } else {
        setToast({ text, tone: 'ok' })
        router.refresh()
      }
    })
  }

  const top = fields.filter((f) => !f.hidden && !f.section)
  const main = top.filter((f) => !f.sidebar)
  // Languages first: it decides what goes live.
  const side = top.filter((f) => f.sidebar).sort((a, b) => Number(b.name === 'translated') - Number(a.name === 'translated'))
  const more = fields.filter((f) => !f.hidden && f.section === 'more' && visible(f, doc))
  const advanced = fields.filter((f) => !f.hidden && f.section === 'advanced' && visible(f, doc))
  const live = doc._status === 'published'
  const noun = singular ?? 'page'

  const primary =
    'rounded-lg bg-ignition-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-[#ff7343] disabled:opacity-50'
  const secondary =
    'rounded-lg border border-ink-950 bg-white px-4 py-2 text-sm font-semibold hover:bg-ink-950 hover:text-sand-50 disabled:opacity-50'

  return (
    <FormCtx.Provider value={ctx}>
      <div className="sticky top-0 z-20 -mx-4 mb-6 flex flex-wrap items-center gap-2 border-b border-sand-300 bg-sand-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        {drafts && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${live ? 'bg-verified-600 text-white' : 'bg-sand-300 text-ink-800'}`}
          >
            <span aria-hidden className={`size-2 rounded-full ${live ? 'bg-white' : 'bg-ink-600'}`} />
            {live ? 'Live on the site' : isNew ? 'New, not saved' : 'Draft, not on the site'}
          </span>
        )}
        {dirty && <span className="text-xs font-medium text-[#B54708]">Unsaved changes</span>}
        <div className="ms-auto flex flex-wrap items-center gap-2">
          {viewUrls?.ar && (
            <a href={viewUrls.ar} target="_blank" rel="noreferrer" className="text-sm underline">
              View (Arabic)
            </a>
          )}
          {viewUrls?.en && (
            <a href={viewUrls.en} target="_blank" rel="noreferrer" className="text-sm underline">
              View (English)
            </a>
          )}
          {extraActions}
          {drafts ? (
            live ? (
              <>
                <button type="button" disabled={pending} onClick={() => save('draft')} className={secondary}>
                  Unpublish
                </button>
                <button type="button" disabled={pending} onClick={() => save('published')} className={primary}>
                  {pending ? 'Saving…' : 'Save changes'}
                </button>
              </>
            ) : (
              <>
                <button type="button" disabled={pending} onClick={() => save('draft')} className={secondary}>
                  Save draft
                </button>
                <button type="button" disabled={pending} onClick={() => save('published')} className={primary}>
                  {pending ? 'Saving…' : `Publish ${noun}`}
                </button>
              </>
            )
          ) : (
            <button type="button" disabled={pending} onClick={() => save()} className={primary}>
              {pending ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </div>

      {problems && (
        <div
          ref={errorBox}
          role="alert"
          className="mb-6 scroll-mt-24 rounded-xl border border-[#B42318]/40 bg-[#FEF3F2] p-4 text-sm text-[#7A271A]"
        >
          <p className="font-semibold text-[#B42318]">
            {problems.publishing
              ? `Not published yet. ${problems.list.length === 1 ? 'One thing' : `${problems.list.length} things`} to fix first:`
              : 'Not saved. Please fix:'}
          </p>
          <ul className="mt-2 space-y-2">
            {problems.list.map((e, i) => {
              const label = e.path ? pathLabel(fields, e.path) : ''
              return (
                <li key={i} className="flex gap-2">
                  <span aria-hidden>•</span>
                  <span>
                    {e.message}{' '}
                    {label && (
                      <button type="button" onClick={() => goTo(e.path)} className="font-semibold underline">
                        Go to “{label}”
                      </button>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
          {problems.publishing && (
            <p className="mt-3 text-xs">
              Tip: “Save draft” always works, so you never lose your work while you finish.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <FieldList fields={main} value={doc} onChange={update} path="" />
        </div>
        {side.length > 0 && (
          <aside className="min-w-0 space-y-5 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <div className="space-y-5 rounded-xl border border-sand-300 bg-white p-4 lg:sticky lg:top-20">
              <FieldList fields={side} value={doc} onChange={update} path="" />
            </div>
          </aside>
        )}
        {(more.length > 0 || advanced.length > 0) && (
          <div className="min-w-0 space-y-4 lg:col-start-1">
            {more.length > 0 && (
              <Collapsible
                title="More details"
                hint={`Optional. ${more.map(labelOf).slice(0, 4).join(', ')}${more.length > 4 ? '…' : ''}`}
                open={open.more}
                onToggle={() => setOpen((o) => ({ ...o, more: !o.more }))}
              >
                <FieldList fields={more} value={doc} onChange={update} path="" />
              </Collapsible>
            )}
            {advanced.length > 0 && (
              <Collapsible
                title="Advanced"
                hint={`Rarely needed. ${advanced.map(labelOf).slice(0, 3).join(', ')}${advanced.length > 3 ? '…' : ''}`}
                open={open.advanced}
                onToggle={() => setOpen((o) => ({ ...o, advanced: !o.advanced }))}
              >
                <FieldList fields={advanced} value={doc} onChange={update} path="" />
              </Collapsible>
            )}
          </div>
        )}
      </div>

      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl bg-ink-950 px-4 py-3 text-sm text-sand-50 shadow-lg sm:inset-x-auto sm:end-6"
        >
          <span aria-hidden className="text-verified-600">
            ✓
          </span>
          <span className="flex-1">{toast.text}</span>
          <button type="button" onClick={() => setToast(null)} className="text-sand-300 underline">
            Close
          </button>
        </div>
      )}
    </FormCtx.Provider>
  )
}

function Collapsible({
  title,
  hint,
  open,
  onToggle,
  children,
}: {
  title: string
  hint: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-sand-300 bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-start"
      >
        <span aria-hidden className={`text-ink-600 transition-transform ${open ? 'rotate-90' : ''}`}>
          ▸
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{title}</span>
          {!open && <span className="block truncate text-xs text-ink-600">{hint}</span>}
        </span>
      </button>
      {open && <div className="space-y-6 border-t border-sand-300 p-4">{children}</div>}
    </section>
  )
}

export { defaultsFor }
