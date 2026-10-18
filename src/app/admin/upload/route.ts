import { NextResponse } from 'next/server'

import { canWrite, getAdminUser, privateFileVisible } from '@/cms/auth'
import { cms } from '@/cms/local'
import { getCollectionConfig } from '@/cms/schema'

/** Admin uploads (images into `media`, PDFs into `private-files`). Bodies are capped at 4.5 MB on Vercel. */
export async function POST(request: Request) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })
  const form = await request.formData()
  const collection = String(form.get('collection') || '')
  const config = getCollectionConfig(collection)
  if (!config?.upload || !canWrite(user, config)) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 })
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file.' }, { status: 400 })

  const purpose = String(form.get('purpose') || 'cv')
  if (config.upload === 'private' && !privateFileVisible(user, purpose))
    return NextResponse.json({ error: 'Not allowed.' }, { status: 403 })

  try {
    const data = config.upload === 'private' ? { purpose } : { alt: { ar: '', en: '' } }
    const doc = (await cms.create({
      collection: config.slug as 'media' | 'private-files',
      data,
      file: { data: Buffer.from(await file.arrayBuffer()), mimetype: file.type, name: file.name, size: file.size },
    })) as { id: string; url?: string | null; filename?: string | null }
    return NextResponse.json({
      id: doc.id,
      label: doc.filename ?? file.name,
      thumb: config.upload === 'media' ? doc.url : null,
    })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
