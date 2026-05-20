'use client'

import Link from 'next/link'
import type { DashboardItem, Line, MetraTripDetail, Station } from '@ctt/shared'
import { dashboardItemKey, shortenStationName } from '@ctt/shared'
import { useAuth } from '@components/AuthProvider'
import { useDashboardStore } from '@lib/store/dashboard'
import {
  useDashboardItemTripQuery,
  useLinesQuery,
  useStationsQuery,
} from '@lib/hooks/useDashboardQueries'
import { dashboardItemRoute } from '@lib/dashboardItemRoute'

type GroupKey = 'train' | 'station' | 'line'

const GROUP_TITLES: Record<GroupKey, string> = {
  train: 'Trains',
  station: 'Stations',
  line: 'Lines',
}

const GROUP_ORDER: GroupKey[] = ['train', 'station', 'line']

export default function DashboardItemsList() {
  const { user, loading } = useAuth()
  const items = useDashboardStore((s) => s.items)
  const { data: lines } = useLinesQuery()
  const { data: stations } = useStationsQuery()

  if (loading || !user) return null

  const grouped: Record<GroupKey, DashboardItem[]> = { train: [], station: [], line: [] }
  for (const item of items) grouped[item.type].push(item)

  if (items.length === 0) {
    return (
      <aside className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Dashboard items</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Open any line, station, or train, then tap &quot;+ Dashboard&quot; on the hero to add it
          here.
        </p>
      </aside>
    )
  }

  return (
    <aside className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Dashboard items</h2>
      <div className="space-y-5">
        {GROUP_ORDER.map((key) => {
          const groupItems = grouped[key]
          if (groupItems.length === 0) return null
          return (
            <section key={key}>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                {GROUP_TITLES[key]}
              </h3>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {groupItems.map((item) => {
                  const RowComponent = item.type === 'train' ? TrainRow : NonTrainRow
                  return (
                    <RowComponent
                      key={dashboardItemKey(item.type, item.id)}
                      item={item}
                      lines={lines}
                      stations={stations}
                    />
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </aside>
  )
}

interface RowProps {
  item: DashboardItem
  lines: Line[] | undefined
  stations: Station[] | undefined
}

function NonTrainRow({ item, lines, stations }: RowProps) {
  const { title, subtitle } = describeNonTrain(item, lines, stations)
  return (
    <RowChrome title={title} subtitle={subtitle} href={dashboardItemRoute(item, lines, stations)} />
  )
}

function TrainRow({ item, lines, stations }: RowProps) {
  // Fetch the trip per row so the menu can show "{origin} to {destination}"
  // mirroring the dashboard TrainCard. Falls back to "Train {n}" until the
  // trip doc resolves.
  const { data: trip } = useDashboardItemTripQuery(item.id) as { data: MetraTripDetail | null }
  const { title, subtitle } = describeTrain(item, lines, trip)
  return (
    <RowChrome title={title} subtitle={subtitle} href={dashboardItemRoute(item, lines, stations)} />
  )
}

function RowChrome({
  title,
  subtitle,
  href,
}: {
  title: string
  subtitle: string | null
  href: string | null
}) {
  const content = (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{title}</p>
      {subtitle && <p className="truncate text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
    </div>
  )
  if (href) {
    return (
      <li>
        <Link href={href} className="block py-2 transition hover:bg-gray-50 dark:hover:bg-gray-800">
          {content}
        </Link>
      </li>
    )
  }
  return <li className="py-2 opacity-60">{content}</li>
}

function describeNonTrain(
  item: DashboardItem,
  lines: Line[] | undefined,
  stations: Station[] | undefined,
): { title: string; subtitle: string | null } {
  if (item.type === 'line') {
    const line = (lines ?? []).find((l) => l.slug === item.id)
    if (!line) return { title: item.id, subtitle: null }
    const subtitle = line.termini?.length ? line.termini.join(' — ') : null
    return { title: line.name, subtitle }
  }
  // station
  const station = (stations ?? []).find((s) => s.slug === item.id)
  if (!station) return { title: item.id, subtitle: null }
  const svc = station.service === 'metra' ? 'Metra' : 'CTA'
  return { title: station.name, subtitle: svc }
}

function describeTrain(
  item: DashboardItem,
  lines: Line[] | undefined,
  trip: MetraTripDetail | null,
): { title: string; subtitle: string | null } {
  const [lineSlugFromId, trainNumberFromId] = item.id.split('_')
  const trainNumber = trip?.trainNumber ?? trainNumberFromId ?? item.id
  const firstStop = trip?.stops?.[0]
  const lastStop = trip?.stops?.[trip.stops.length - 1]
  const originStop = trip?.stops?.find((s) => s.slug === item.trainOriginStopSlug) ?? firstStop
  const destStop = trip?.stops?.find((s) => s.slug === item.trainDestinationStopSlug) ?? lastStop
  const title =
    trip && originStop && destStop
      ? `${shortenStationName(originStop.stationName)} to ${shortenStationName(destStop.stationName)}`
      : `Train ${trainNumber}`
  const line = lines?.find((l) => l.slug === (trip?.lineSlug ?? lineSlugFromId))
  const lineLabel = trip?.line ?? line?.shortName ?? ''
  const subtitle = `${lineLabel ? `${lineLabel} ` : ''}#${trainNumber}`
  return { title, subtitle }
}
