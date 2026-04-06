import type { Metadata } from 'next'
import Link from 'next/link'
import { getFirestore } from '../../../../lib/firebase-admin'
import { getLinesForService } from '../../../../lib/transit'
import Breadcrumb from '../../../../components/Breadcrumb'
import PageHeader from '../../../../components/PageHeader'
import { siteConfig } from '../../../../lib/siteConfig'

// ---------------------------------------------------------------------------
// Data types (mirrors Firestore metra-trips / metra-trip-indexes documents)
// ---------------------------------------------------------------------------

interface TripStop {
  sequence: number
  stationName: string
  slug: string | null
  arrival: string
  departure: string
}

interface TripDetail {
  tripId: string
  trainNumber: string
  headsign: string
  line: string
  lineSlug: string
  lineName: string
  serviceType: 'weekday' | 'saturday' | 'sunday'
  directionId: number
  stops: TripStop[]
}

interface TripIndexEntry {
  tripId: string
}

interface TripIndex {
  weekday: TripIndexEntry[]
  saturday: TripIndexEntry[]
  sunday: TripIndexEntry[]
}

// ---------------------------------------------------------------------------
// Firestore helpers
// ---------------------------------------------------------------------------

async function readIndex(lineSlug: string): Promise<TripIndex | null> {
  const db = getFirestore()
  const doc = await db.collection('metra-trip-indexes').doc(lineSlug).get()
  if (!doc.exists) return null
  return doc.data() as TripIndex
}

async function readDetail(tripId: string): Promise<TripDetail | null> {
  const db = getFirestore()
  const doc = await db.collection('metra-trips').doc(tripId).get()
  if (!doc.exists) return null
  return doc.data() as TripDetail
}

const SERVICE_LABEL: Record<string, string> = {
  weekday: 'Weekday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

const SERVICE_COLOR: Record<string, string> = {
  weekday: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  saturday: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  sunday: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
}

// ---------------------------------------------------------------------------
// Static generation
// ---------------------------------------------------------------------------

type Props = { params: Promise<{ line: string; tripId: string }> }

export async function generateStaticParams() {
  const lines = await getLinesForService('metra')
  const pairs: { line: string; tripId: string }[] = []

  for (const line of lines) {
    const index = await readIndex(line.slug)
    if (!index) continue
    const allEntries = [...index.weekday, ...index.saturday, ...index.sunday]
    for (const entry of allEntries) {
      pairs.push({ line: line.slug, tripId: entry.tripId })
    }
  }

  return pairs
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { line: lineSlug, tripId } = await params
  const trip = await readDetail(tripId)
  if (!trip) return {}

  const title = `Train ${trip.trainNumber} — ${trip.headsign}`
  const description = `${trip.lineName} ${SERVICE_LABEL[trip.serviceType]} train ${trip.trainNumber} to ${trip.headsign} — full stop schedule with arrival and departure times.`

  return {
    title,
    description,
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      url: `${siteConfig.url}/metra/${lineSlug}/train/${tripId}`,
      images: [siteConfig.ogImage],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${siteConfig.name}`,
      description,
      images: [siteConfig.ogImage],
    },
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function MetraTripPage({ params }: Props) {
  const { line: lineSlug, tripId } = await params
  const trip = await readDetail(tripId)

  if (!trip) {
    return (
      <main>
        <p className="text-gray-500 dark:text-gray-400">Train not found.</p>
      </main>
    )
  }

  return (
    <main>
      <Breadcrumb
        items={[
          { label: 'Metra Lines', href: '/metra' },
          { label: trip.lineName, href: `/metra/${lineSlug}` },
          { label: `Train ${trip.trainNumber}` },
        ]}
      />

      <PageHeader
        title={`Train ${trip.trainNumber}`}
        description={`To ${trip.headsign}`}
        badges={
          <>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {trip.line}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${SERVICE_COLOR[trip.serviceType]}`}
            >
              {SERVICE_LABEL[trip.serviceType]}
            </span>
          </>
        }
      />

      {/* Stop sequence table */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
            Stop Schedule — {trip.stops.length} stops
          </p>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {trip.stops.map((stop) => (
            <div key={stop.sequence} className="flex items-center gap-4 px-5 py-3">
              {/* Stop number */}
              <span className="w-6 shrink-0 text-center text-xs font-medium text-gray-400 dark:text-gray-500">
                {stop.sequence}
              </span>

              {/* Station name */}
              <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
                {stop.slug ? (
                  <Link
                    href={`/metra/${lineSlug}/${stop.slug}`}
                    className="transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {stop.stationName}
                  </Link>
                ) : (
                  stop.stationName
                )}
              </span>

              {/* Times */}
              <div className="flex shrink-0 items-center gap-6">
                {stop.arrival !== stop.departure ? (
                  <>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 dark:text-gray-500">Arr</p>
                      <p className="text-sm font-medium text-gray-900 tabular-nums dark:text-white">
                        {stop.arrival}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 dark:text-gray-500">Dep</p>
                      <p className="text-sm font-medium text-gray-900 tabular-nums dark:text-white">
                        {stop.departure}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-right">
                    <p className="text-xs text-gray-400 dark:text-gray-500">Time</p>
                    <p className="text-sm font-medium text-gray-900 tabular-nums dark:text-white">
                      {stop.departure}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
