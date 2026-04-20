import { NextRequest, NextResponse } from 'next/server'

const METRA_BASE = 'https://gtfspublic.metrarr.com/gtfs/public'

// Only these feed paths are proxied. Anything else is rejected at the edge
// so the upstream URL can never be influenced by an arbitrary client path.
const ALLOWED_PATHS: ReadonlySet<string> = new Set(['positions', 'tripupdates'])

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const feedPath = path.join('/')

  if (!ALLOWED_PATHS.has(feedPath)) {
    return NextResponse.json({ error: 'Unknown Metra feed path' }, { status: 400 })
  }

  const token = process.env.METRA_API_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'METRA_API_TOKEN is not configured' }, { status: 500 })
  }

  const metraUrl = new URL(`${METRA_BASE}/${feedPath}`)
  metraUrl.searchParams.set('api_token', token)

  const res = await fetch(metraUrl.toString())
  if (!res.ok) {
    return new NextResponse(await res.text(), { status: res.status })
  }

  const buffer = await res.arrayBuffer()
  return new NextResponse(buffer, {
    status: 200,
    headers: { 'Content-Type': 'application/x-protobuf' },
  })
}
