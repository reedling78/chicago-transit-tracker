import type { Metadata } from 'next'
import { getLinesForService, getLine, getStationsForLine, getStation } from '../../../lib/transit'
import Breadcrumb from '../../../components/Breadcrumb'
import StationDetail from '../../../components/StationDetail'

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
      <Breadcrumb items={[
        { label: 'Metra Lines', href: '/metra' },
        { label: line?.name ?? lineSlug, href: `/metra/${lineSlug}` },
        { label: station.name },
      ]} />

      <StationDetail station={station} />
    </main>
  )
}
