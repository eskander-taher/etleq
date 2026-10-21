'use client'

/** Vercel rejects request bodies over 4.5 MB; the CMS caps uploads at 4 MB. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
const MAX_EDGE = 2400

export type Uploaded = { id: string; label: string; thumb?: string | null }

/**
 * Phone screenshots are often large PNGs. Shrink big images in the browser
 * (longest edge 2400 px, WebP) so founders never hit the size limit.
 */
export async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') return file
  // Formats the CMS accepts pass through when small; others (e.g. iPhone HEIC) are converted.
  const accepted = /^image\/(png|jpe?g|webp|avif)$/.test(file.type)
  if (accepted && file.size <= 1.5 * 1024 * 1024) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.86))
    if (!blob || (accepted && blob.size >= file.size)) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' })
  } catch {
    return file
  }
}

export async function uploadFile(file: File, collection: string, purpose?: string): Promise<Uploaded> {
  const isImage = collection === 'media'
  if (isImage && !file.type.startsWith('image/')) throw new Error(`“${file.name}” is not an image.`)
  if (!isImage && file.type !== 'application/pdf') throw new Error(`“${file.name}” is not a PDF.`)
  const ready = isImage ? await shrinkImage(file) : file
  if (ready.size > MAX_UPLOAD_BYTES)
    throw new Error(`“${file.name}” is larger than 4 MB. Please use a smaller file.`)
  const body = new FormData()
  body.set('file', ready)
  body.set('collection', collection)
  if (purpose) body.set('purpose', purpose)
  const res = await fetch('/admin/upload', { method: 'POST', body })
  let json: { id?: string; label?: string; thumb?: string; error?: string } = {}
  try {
    json = await res.json()
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok || !json.id) throw new Error(json.error || `Could not upload “${file.name}”. Please try again.`)
  return { id: json.id, label: json.label || file.name, thumb: json.thumb }
}
