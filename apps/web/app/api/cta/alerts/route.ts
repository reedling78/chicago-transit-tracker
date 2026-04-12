import { NextRequest, NextResponse } from 'next/server'

const CTA_ALERTS_BASE = 'https://www.transitchicago.com/api/1.0/alerts.aspx'

export async function GET(request: NextRequest) {
  const url = new URL(CTA_ALERTS_BASE)
  url.searchParams.set('outputType', 'JSON')

  const routeid = request.nextUrl.searchParams.get('routeid')
  if (routeid) {
    url.searchParams.set('routeid', routeid)
  }

  const res = await fetch(url.toString())
  if (!res.ok) {
    return new NextResponse(await res.text(), { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
