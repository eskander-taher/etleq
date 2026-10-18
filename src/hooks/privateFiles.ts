// Vercel functions accept request bodies up to 4.5 MB, so uploads are capped at 4 MB.
export const MAX_PRIVATE_FILE_BYTES = 4 * 1024 * 1024
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d] // "%PDF-"

/** True when the buffer starts with the PDF signature `%PDF-`. Extensions and MIME types are not trusted. */
export function isPdfBuffer(data: Uint8Array | null | undefined): boolean {
  if (!data || data.length < PDF_MAGIC.length) return false
  return PDF_MAGIC.every((byte, i) => data[i] === byte)
}

export type FileCheck = { ok: true } | { ok: false; message: string }

/** Validate an uploaded private file: PDF signature and at most 4 MB. */
export function checkPrivateFile(file: {
  data?: Uint8Array | null
  size?: number | null
  mimetype?: string | null
}): FileCheck {
  const size = file.size ?? file.data?.length ?? 0
  if (size > MAX_PRIVATE_FILE_BYTES) return { ok: false, message: 'The file is larger than 4 MB.' }
  if (file.mimetype && file.mimetype !== 'application/pdf')
    return { ok: false, message: 'Only PDF files are accepted.' }
  if (!isPdfBuffer(file.data)) return { ok: false, message: 'The file is not a valid PDF.' }
  return { ok: true }
}
