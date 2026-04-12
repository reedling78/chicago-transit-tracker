import { NextRequest, NextResponse } from 'next/server'
import { DEV_FALLBACK_RESPONSE } from './fixture'

const ALLOWED_ROUTES = new Set(['red', 'blue', 'brn', 'g', 'org', 'p', 'pink', 'y'])
const UPSTREAM = 'https://lapi.transitchicago.com/api/1.0/ttpositions.aspx'

export async function GET(req: NextRequest) {
  const rt = new URL(req.url).searchParams.get('rt')
  if (!rt) {
    return NextResponse.json({ error: 'Missing rt query parameter' }, { status: 400 })
  }
  if (!ALLOWED_ROUTES.has(rt.toLowerCase())) {
    return NextResponse.json({ error: 'Unknown route' }, { status: 400 })
  }

  const key = process.env.CTA_TRAIN_TRACKER_KEY
  if (!key) {
    return NextResponse.json(DEV_FALLBACK_RESPONSE, {
      status: 200,
      headers: {
        'X-Dev-Fallback': '1',
        'Cache-Control': 'no-store',
      },
    })
  }

  const url = new URL(UPSTREAM)
  url.searchParams.set('key', key)
  url.searchParams.set('rt', rt.toLowerCase())
  url.searchParams.set('outputType', 'JSON')

  const upstream = await fetch(url.toString())
  if (!upstream.ok) {
    return NextResponse.json({ error: `Upstream error ${upstream.status}` }, { status: 502 })
  }

  const body = await upstream.json()
  return NextResponse.json(body, {
    status: 200,
    headers: {
      'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=40',
    },
  })
}
