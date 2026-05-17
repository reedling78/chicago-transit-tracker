import { NextRequest, NextResponse } from 'next/server'
import { displayStationName } from '@ctt/shared'
import type { StationTripEntry, StationTrips } from '@ctt/shared'
import { db } from '@lib/firebase-admin'

const normalizeEntries = (entries: StationTripEntry[] = []): StationTripEntry[] =>
  entries.map((e) => ({ ...e, headsign: displayStationName(e.headsign) }))

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const doc = await db.collection('metra-station-trips').doc(slug).get()

  if (!doc.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = doc.data() as StationTrips
  const normalized: StationTrips = {
    ...data,
    weekday: normalizeEntries(data.weekday),
    saturday: normalizeEntries(data.saturday),
    sunday: normalizeEntries(data.sunday),
  }

  return NextResponse.json(normalized, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
