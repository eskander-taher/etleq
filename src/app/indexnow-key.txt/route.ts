import { indexNowKey } from '@/lib/indexnow'

// IndexNow key file. Pings send keyLocation = <site>/indexnow-key.txt, so the key comes from
// INDEXNOW_KEY at request time and no file has to be committed. 404 when the key is unset.
export const dynamic = 'force-dynamic'

export function GET() {
  const key = indexNowKey()
  if (!key) return new Response('Not found', { status: 404 })
  return new Response(key, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
