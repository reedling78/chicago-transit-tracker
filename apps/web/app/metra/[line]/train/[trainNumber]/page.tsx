import type { Metadata } from 'next'
import { getFirestore } from '@lib/firebase-admin'
import { getLinesForService } from '@lib/transit'
import PageHeader from '@components/PageHeader'
import MetraTripRealtime, { type TripDetail } from '@components/MetraTripRealtime'
import { siteConfig } from '@lib/siteConfig'

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

async function readDetail(lineSlug: string, trainNumber: string): Promise<TripDetail | null> {
  const db = getFirestore()
  const doc = await db.collection('metra-trips').doc(`${lineSlug}_${trainNumber}`).get()
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

type Props = { params: Promise<{ line: string; trainNumber: string }> }

export async function generateStaticParams() {
  const lines = await getLinesForService('metra')
  const pairs: { line: string; trainNumber: string }[] = []

  for (const line of lines) {
    const index = await readIndex(line.slug)
    if (!index) continue
    const allEntries = [...index.weekday, ...index.saturday, ...index.sunday]
    const seen = new Set<string>()
    for (const entry of allEntries) {
      if (seen.has(entry.tripId)) continue
      seen.add(entry.tripId)
      pairs.push({ line: line.slug, trainNumber: entry.tripId })
    }
  }

  return pairs
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { line: lineSlug, trainNumber } = await params
  const trip = await readDetail(lineSlug, trainNumber)
  if (!trip) return {}

  const title = `Train ${trip.trainNumber} — ${trip.headsign}`
  const description = `${trip.lineName} ${SERVICE_LABEL[trip.serviceType]} train ${trip.trainNumber} to ${trip.headsign} — full stop schedule with arrival and departure times.`

  return {
    title,
    description,
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      url: `${siteConfig.url}/metra/${lineSlug}/train/${trainNumber}`,
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
  const { line: lineSlug, trainNumber } = await params
  const trip = await readDetail(lineSlug, trainNumber)

  if (!trip) {
    return (
      <main>
        <p className="text-gray-500 dark:text-gray-400">Train not found.</p>
      </main>
    )
  }

  return (
    <main>
      <PageHeader
        title={`Train ${trip.trainNumber}`}
        description={`To ${trip.headsign}`}
        imageSrc="/hero-header-metra.jpg"
        breadcrumbItems={[
          { label: 'Metra Lines', href: '/metra' },
          { label: trip.lineName, href: `/metra/${lineSlug}` },
          { label: `Train ${trip.trainNumber}` },
        ]}
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

      <MetraTripRealtime trip={trip} lineSlug={lineSlug} />
    </main>
  )
}
