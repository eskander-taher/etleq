import { NextResponse } from 'next/server'

import { getAdminUser, privateFileVisible } from '@/cms/auth'
import { cms, readUploadFile } from '@/cms/local'

export const dynamic = 'force-dynamic'

/** Private PDFs (CVs, consent records): only for roles that may see the file's purpose. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAdminUser()
  if (!user) return new NextResponse('Not found', { status: 404 })
  const { id } = await params
  let doc: { purpose?: string | null; filename?: string | null }
  try {
    doc = (await cms.findByID({ collection: 'private-files', id, locale: 'all', depth: 0 })) as typeof doc
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
  if (!privateFileVisible(user, doc.purpose)) return new NextResponse('Not found', { status: 404 })
  const file = await readUploadFile(id)
  if (!file) return new NextResponse('Not found', { status: 404 })
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${(doc.filename || 'file.pdf').replace(/"/g, '')}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
