import { NextRequest, NextResponse } from 'next/server'
import { displayStationName } from '@ctt/shared'
import type { DirectionSchedule, StationSchedule } from '@ctt/shared'
import { db } from '@lib/firebase-admin'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const doc = await db.collection('schedules').doc(slug).get()

  if (!doc.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = doc.data() as StationSchedule
  const normalized: StationSchedule = {
    ...data,
    directions: (data.directions ?? []).map((d: DirectionSchedule) => ({
      ...d,
      headsign: displayStationName(d.headsign),
    })),
  }

  return NextResponse.json(normalized, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
