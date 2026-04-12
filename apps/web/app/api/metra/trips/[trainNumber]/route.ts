import { NextRequest, NextResponse } from 'next/server'
import { db } from '@lib/firebase-admin'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trainNumber: string }> },
) {
  const { trainNumber } = await params
  const line = new URL(req.url).searchParams.get('line')

  if (!line) {
    return NextResponse.json({ error: 'Missing line query parameter' }, { status: 400 })
  }

  const doc = await db.collection('metra-trips').doc(`${line}_${trainNumber}`).get()

  if (!doc.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(doc.data(), {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
