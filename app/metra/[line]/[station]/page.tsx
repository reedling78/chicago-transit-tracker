import type { Metadata } from 'next'
import { getLinesForService, getLine, getStationsForLine, getStation } from '../../../lib/transit'
import Breadcrumb from '../../../components/Breadcrumb'
import PageHeader from '../../../components/PageHeader'
import StationDetail from '../../../components/StationDetail'
import { LINE_COLORS, SERVICE_COLOR, SERVICE_LABEL } from '../../../components/StationDetail'
import StationMap from '../../../components/StationMap'
import Arrivals from '../../../components/Arrivals'
import { siteConfig } from '../../../lib/siteConfig'

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
  const { line: lineSlug, station: slug } = await params
  const station = await getStation(slug)
  if (!station) return {}
  const description = `${station.name} Metra station — lines, accessibility, and location information.`
  return {
    title: station.name,
    description,
    openGraph: {
      title: `${station.name} | ${siteConfig.name}`,
      description,
      url: `${siteConfig.url}/metra/${lineSlug}/${slug}`,
      images: [siteConfig.ogImage],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${station.name} | ${siteConfig.name}`,
      description,
      images: [siteConfig.ogImage],
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

      <PageHeader
        title={station.name}
        badges={
          <>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${SERVICE_COLOR[station.service]}`}>
              {SERVICE_LABEL[station.service]}
            </span>
            {station.terminal && (
              <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                Terminal
              </span>
            )}
            {station.open24Hours && (
              <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-xs font-semibold text-green-700 dark:text-green-400">
                24 Hours
              </span>
            )}
          </>
        }
      >
        {station.lines.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {station.lines.map((line) => {
              const colors = LINE_COLORS[line]
              return colors ? (
                <span key={line} className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: colors.bg, color: colors.text }}>
                  {line}
                </span>
              ) : (
                <span key={line} className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {line}
                </span>
              )
            })}
          </div>
        )}
      </PageHeader>

      <StationMap
        latitude={station.location.latitude}
        longitude={station.location.longitude}
        name={station.name}
        markerColor={line?.color}
      />
      <Arrivals slug={stationSlug} service="metra" hasSchedule={!!station.metraStopId} />
      <StationDetail station={station} />
    </main>
  )
}
