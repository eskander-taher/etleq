import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { siteUrl } from '@/lib/utils'

// Short links (/go/{code}) for reels and bios: 302 (brief section 11) so targets can change.
// UTM parameters from the short-link record are appended, plus `ref={code}` for lead attribution.

export const dynamic = 'force-dynamic'

const CODE = /^[A-Za-z0-9_-]{1,64}$/

interface ShortLinkDoc {
  target?: string | null
  utm?: { source?: string | null; medium?: string | null; campaign?: string | null; content?: string | null } | null
}

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  if (!CODE.test(code)) return new NextResponse('Not found', { status: 404 })

  let link: ShortLinkDoc | undefined
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({ collection: 'short-links', where: { code: { equals: code } }, limit: 1, depth: 0, overrideAccess: true })
    link = res.docs[0] as ShortLinkDoc | undefined
  } catch (err) {
    console.error('[go] lookup failed:', (err as Error).message)
    return new NextResponse('Temporarily unavailable', { status: 503 })
  }
  if (!link?.target) return new NextResponse('Not found', { status: 404 })

  const base = siteUrl()
  let url: URL
  try {
    url = new URL(link.target, `${base}/`)
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
  // Only redirect to our own site: short links are not an open redirect.
  if (url.origin !== new URL(base).origin) return new NextResponse('Not found', { status: 404 })

  for (const [k, v] of Object.entries(link.utm ?? {})) {
    if (v && !url.searchParams.has(`utm_${k}`)) url.searchParams.set(`utm_${k}`, v)
  }
  if (!url.searchParams.has('ref')) url.searchParams.set('ref', code)

  return NextResponse.redirect(url, { status: 302, headers: { 'Cache-Control': 'no-store' } })
}
