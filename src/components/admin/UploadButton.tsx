'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/** Upload a file into `media` or `private-files`, then open the new document. */
export function UploadButton({ collection, purpose }: { collection: string; purpose?: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const upload = async (file: File) => {
    setBusy(true)
    setError('')
    const body = new FormData()
    body.set('file', file)
    body.set('collection', collection)
    if (purpose) body.set('purpose', purpose)
    try {
      const res = await fetch('/admin/upload', { method: 'POST', body })
      const json = (await res.json()) as { id?: string; error?: string }
      if (!res.ok || !json.id) throw new Error(json.error || 'Upload failed.')
      router.push(`/admin/collections/${collection}/${json.id}`)
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-sm text-[#B42318]">{error}</span>}
      <label className="cursor-pointer rounded-lg bg-ignition-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-[#ff7343]">
        {busy ? 'Uploading…' : collection === 'media' ? 'Upload image' : 'Upload PDF'}
        <input
          type="file"
          className="sr-only"
          accept={collection === 'media' ? 'image/*' : 'application/pdf'}
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void upload(file)
            e.target.value = ''
          }}
        />
      </label>
    </div>
  )
}
