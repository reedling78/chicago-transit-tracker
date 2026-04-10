import type { Metadata } from 'next'
import {
  getAllLines,
  getLinesForService,
  getLine,
  getStationsForLine,
  getStation,
} from '@lib/transit'
import PageHeader from '@components/PageHeader'
import StationDetail from '@components/StationDetail'
import LineChipList, { type LineLinkInfo } from '@components/LineChipList'
import StationMap from '@components/StationMap'
import Arrivals from '@components/Arrivals'
import { siteConfig } from '@lib/siteConfig'

type Props = { params: Promise<{ line: string; station: string }> }

export async function generateStaticParams() {
  const lines = await getLinesForService('cta')
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
  const description = `${station.name} CTA station — lines, accessibility, and location information.`
  return {
    title: station.name,
    description,
    openGraph: {
      title: `${station.name} | ${siteConfig.name}`,
      description,
      url: `${siteConfig.url}/cta/${lineSlug}/${slug}`,
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

export default async function CTAStationPage({ params }: Props) {
  const { line: lineSlug, station: stationSlug } = await params
  const [line, station, allLines] = await Promise.all([
    getLine(lineSlug),
    getStation(stationSlug),
    getAllLines(),
  ])

  if (!station)
    return (
      <main>
        <p>Station not found.</p>
      </main>
    )

  const lineLookup: Record<string, LineLinkInfo> = Object.fromEntries(
    allLines.map((l) => [l.shortName, { slug: l.slug, service: l.service }]),
  )

  return (
    <main>
      <PageHeader
        title={station.name}
        breadcrumbItems={[
          { label: 'CTA Lines', href: '/cta' },
          { label: line?.name ?? lineSlug, href: `/cta/${lineSlug}` },
          { label: station.name },
        ]}
        badges={
          <>
            {station.terminal && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                Terminal
              </span>
            )}
            {station.open24Hours && (
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                24 Hours
              </span>
            )}
          </>
        }
      >
        <LineChipList lineNames={station.lines} lineLookup={lineLookup} />
      </PageHeader>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="w-full lg:w-2/3">
          <StationMap
            latitude={station.location.latitude}
            longitude={station.location.longitude}
            name={station.name}
            markerColor={line?.color}
          />
          <StationDetail station={station} />
        </div>
        <div className="w-full lg:w-1/3">
          <Arrivals slug={stationSlug} service="cta" hasSchedule={!!station.ctaMapId} />
        </div>
      </div>
    </main>
  )
}
