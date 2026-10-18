import { NextResponse } from 'next/server'

import { runRetention } from '@/cms/retention'

export const dynamic = 'force-dynamic'

/**
 * Daily retention job (Vercel Cron, see vercel.json). Vercel sends
 * `Authorization: Bearer $CRON_SECRET`; anything else is rejected.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`)
    return new NextResponse('Unauthorized', { status: 401 })
  const result = await runRetention()
  return NextResponse.json(result)
}
