import type { Metadata } from 'next'
import Link from 'next/link'
import { getLinesForService, getLine, getStationsForLine, getStation } from '../../../lib/transit'

type Props = { params: Promise<{ line: string; station: string }> }

export async function generateStaticParams() {
  const lines = await getLinesForService('metra')
  const pairs = await Promise.all(
    lines.map(async (line) => {
      const stations = await getStationsForLine(line.shortName)
      return stations.map((s) => ({ line: line.slug, station: s.slug }))
    }),
  )
  return pairs.flat()
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { station: slug } = await params
  const station = await getStation(slug)
  if (!station) return {}
  return {
    title: station.name,
    description: `${station.name} Metra station — lines, accessibility, and location information.`,
    openGraph: {
      title: `${station.name} | Chicago Transit Tracker`,
      description: `${station.name} Metra station information.`,
      url: `https://chicago-transit-tracker.com/metra/${(await params).line}/${slug}`,
      type: 'website',
    },
  }
}

export default async function MetraStationPage({ params }: Props) {
  const { line: lineSlug, station: stationSlug } = await params
  const [line, station] = await Promise.all([
    getLine(lineSlug),
    getStation(stationSlug),
  ])

  if (!station) return <main><p>Station not found.</p></main>

  return (
    <main>
      <p>
        <Link href="/metra">← Metra Lines</Link>
        {line && <>{' / '}<Link href={`/metra/${lineSlug}`}>← {line.name}</Link></>}
      </p>

      <h1>{station.name}</h1>

      <dl>
        <dt>Service</dt>
        <dd>Metra</dd>

        <dt>Lines</dt>
        <dd>{station.lines.join(', ')}</dd>

        {station.address && (
          <>
            <dt>Address</dt>
            <dd>{station.address}</dd>
          </>
        )}

        {station.municipality && (
          <>
            <dt>Municipality</dt>
            <dd>{station.municipality}</dd>
          </>
        )}

        <dt>Latitude / Longitude</dt>
        <dd>{station.location.latitude}, {station.location.longitude}</dd>

        <dt>Station Type</dt>
        <dd>{station.stationType}</dd>

        <dt>Terminal</dt>
        <dd>{station.terminal ? 'Yes' : 'No'}</dd>

        {station.hours && (
          <>
            <dt>Hours — Weekday</dt>
            <dd>{station.hours.weekday}</dd>
            <dt>Hours — Saturday</dt>
            <dd>{station.hours.saturday}</dd>
            <dt>Hours — Sunday</dt>
            <dd>{station.hours.sunday}</dd>
          </>
        )}

        <dt>ADA Accessible</dt>
        <dd>{station.accessibility.ada ? 'Yes' : 'No'}</dd>

        <dt>Parking</dt>
        <dd>{station.parking ? 'Yes' : 'No'}</dd>

        {station.amenities.length > 0 && (
          <>
            <dt>Amenities</dt>
            <dd>{station.amenities.join(', ')}</dd>
          </>
        )}

        {station.metraStopId && (
          <>
            <dt>Metra Stop ID</dt>
            <dd>{station.metraStopId}</dd>
          </>
        )}
      </dl>
    </main>
  )
}
