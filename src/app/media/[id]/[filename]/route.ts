import { NextResponse } from 'next/server'

import { getDb, idCandidates } from '@/cms/db'
import { readUploadFile } from '@/cms/local'

/** Public images uploaded through the admin. Immutable per id, so cached for a year at the CDN. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; filename: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f]{24}$/.test(id)) return new NextResponse('Not found', { status: 404 })
  // Only `media` documents are public; private files share the binary store.
  const db = await getDb()
  const media = await db
    .collection('media')
    .findOne({ _id: { $in: idCandidates(id) } } as never, { projection: { _id: 1 } })
  if (!media) return new NextResponse('Not found', { status: 404 })
  const file = await readUploadFile(id)
  if (!file) return new NextResponse('Not found', { status: 404 })
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      'Content-Type': file.mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      ...(file.mimeType === 'image/svg+xml'
        ? { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'" }
        : {}),
    },
  })
}
