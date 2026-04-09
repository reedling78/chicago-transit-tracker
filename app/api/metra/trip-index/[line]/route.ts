import { NextRequest, NextResponse } from 'next/server'
import { db } from '@lib/firebase-admin'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ line: string }> }) {
  const { line } = await params
  const doc = await db.collection('metra-trip-indexes').doc(line).get()

  if (!doc.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(doc.data(), {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
