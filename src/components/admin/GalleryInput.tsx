'use client'

import { useContext, useEffect, useRef, useState, type DragEvent } from 'react'

import { saveMediaAlt } from '@/app/admin/actions'
import type { ArrayField } from '@/cms/schema/types'

import { type Doc, FormCtx, inputClass, move, newRowId, optionsKey, smallButton } from './fields'
import { uploadFile } from './upload'

/**
 * Screenshots for an array of `{ image → media }` rows: drop or pick several
 * images at once, reorder, remove, and describe each one (alt text).
 */
export function GalleryInput({
  field,
  rows,
  onChange,
}: {
  field: ArrayField
  rows: Doc[]
  onChange: (v: Doc[]) => void
}) {
  const { options, addOption } = useContext(FormCtx)
  const sub = field.fields.find((f) => f.type === 'upload')
  const key = sub && sub.type === 'upload' ? optionsKey(sub) : 'media'
  const subName = sub?.name ?? 'image'
  const byId = new Map((options[key] ?? []).map((o) => [o.value, o]))
  const [busy, setBusy] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [over, setOver] = useState(false)
  const [picking, setPicking] = useState(false)
  // Latest rows and change handler, read after the async uploads finish.
  const rowsRef = useRef(rows)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    rowsRef.current = rows
    onChangeRef.current = onChange
  }, [rows, onChange])

  const addFiles = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name))
    const skipped = files.length - images.length
    setErrors(skipped ? [`${skipped} file${skipped > 1 ? 's were' : ' was'} skipped: only images can be added.`] : [])
    setBusy(images.length)
    const added: Doc[] = []
    // One at a time keeps each request under the 4.5 MB limit and the order as chosen.
    for (const file of images) {
      try {
        const up = await uploadFile(file, 'media')
        addOption(key, { value: up.id, label: up.label, thumb: up.thumb, alt: {} })
        added.push({ id: newRowId(), [subName]: up.id })
      } catch (error) {
        setErrors((e) => [...e, (error as Error).message])
      } finally {
        setBusy((n) => n - 1)
      }
    }
    // A single change at the end, so nothing typed elsewhere meanwhile is overwritten.
    if (added.length) onChangeRef.current([...rowsRef.current, ...added])
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    void addFiles(Array.from(e.dataTransfer.files ?? []))
  }

  const library = (options[key] ?? []).filter((o) => !rows.some((r) => String(r?.[subName]) === o.value))

  return (
    <div className="space-y-3">
      {rows.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row, i) => {
            const id = String(row?.[subName] ?? '')
            const option = byId.get(id)
            return (
              <li key={row?.id ?? i} className="flex flex-col overflow-hidden rounded-xl border border-sand-300 bg-white">
                <div className="relative bg-sand-100">
                  {option?.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin preview of uploaded media
                    <img src={option.thumb} alt="" className="aspect-[4/3] w-full object-contain" />
                  ) : (
                    <div className="grid aspect-[4/3] place-items-center text-xs text-ink-600">No preview</div>
                  )}
                  {i === 0 && (
                    <span className="absolute start-2 top-2 rounded-full bg-ink-950 px-2 py-0.5 text-[11px] font-semibold text-sand-50">
                      Cover
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 border-t border-sand-300 p-2">
                  <button
                    type="button"
                    className={smallButton}
                    disabled={i === 0}
                    onClick={() => onChange(move(rows, i, i - 1))}
                    aria-label="Move earlier"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className={smallButton}
                    disabled={i === rows.length - 1}
                    onClick={() => onChange(move(rows, i, i + 1))}
                    aria-label="Move later"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    className={`${smallButton} ms-auto`}
                    onClick={() => onChange(rows.filter((_, j) => j !== i))}
                  >
                    Remove
                  </button>
                </div>
                {id && <AltEditor id={id} initial={option?.alt} />}
              </li>
            )
          })}
        </ul>
      )}

      <label
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center ${over ? 'border-ink-950 bg-sand-100' : 'border-sand-300 bg-white hover:border-ink-600'}`}
      >
        <span className="text-sm font-semibold">
          {busy > 0 ? `Uploading ${busy} image${busy > 1 ? 's' : ''}…` : 'Add screenshots'}
        </span>
        <span className="text-xs text-ink-600">
          Drag images here, or tap to choose several. Big images are made smaller automatically.
        </span>
        <input
          type="file"
          multiple
          accept="image/*"
          className="sr-only"
          disabled={busy > 0}
          onChange={(e) => {
            void addFiles(Array.from(e.target.files ?? []))
            e.target.value = ''
          }}
        />
      </label>

      {errors.length > 0 && (
        <ul className="space-y-1 text-xs text-[#B42318]">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      {library.length > 0 && (
        <div>
          <button type="button" className="text-xs text-ink-600 underline" onClick={() => setPicking(!picking)}>
            {picking ? 'Hide uploaded images' : 'Or pick an image you uploaded before'}
          </button>
          {picking && (
            <ul className="mt-2 grid max-h-64 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
              {library.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    title={o.label}
                    onClick={() => onChange([...rows, { id: newRowId(), [subName]: o.value }])}
                    className="block w-full overflow-hidden rounded-lg border border-sand-300 hover:border-ink-950"
                  >
                    {o.thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
                      <img src={o.thumb} alt={o.label} className="aspect-square w-full object-cover" />
                    ) : (
                      <span className="block truncate p-2 text-xs">{o.label}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

/** Describe the image for blind visitors; saved on the image itself when the field loses focus. */
function AltEditor({ id, initial }: { id: string; initial?: { ar?: string; en?: string } }) {
  const [alt, setAlt] = useState({ ar: initial?.ar ?? '', en: initial?.en ?? '' })
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [last, setLast] = useState(alt)
  const persist = async () => {
    if (alt.ar === last.ar && alt.en === last.en) return
    setSaved('saving')
    const res = await saveMediaAlt(id, alt)
    setSaved(res.ok ? 'saved' : 'error')
    if (res.ok) setLast(alt)
  }
  const missing = !alt.ar && !alt.en
  return (
    <div className="space-y-1.5 border-t border-sand-300 p-2">
      <p className="text-[11px] text-ink-600">
        {missing ? 'Optional: what does this screen show?' : 'Image description'}
        {saved === 'saving' && ' · saving…'}
        {saved === 'saved' && ' · saved'}
        {saved === 'error' && <span className="text-[#B42318]"> · could not save</span>}
      </p>
      <input
        dir="rtl"
        lang="ar"
        aria-label="Image description in Arabic"
        placeholder="وصف الصورة"
        className={`${inputClass} py-1.5`}
        value={alt.ar}
        onChange={(e) => setAlt({ ...alt, ar: e.target.value })}
        onBlur={persist}
      />
      <input
        dir="ltr"
        aria-label="Image description in English"
        placeholder="e.g. Booking screen"
        className={`${inputClass} py-1.5`}
        value={alt.en}
        onChange={(e) => setAlt({ ...alt, en: e.target.value })}
        onBlur={persist}
      />
    </div>
  )
}
