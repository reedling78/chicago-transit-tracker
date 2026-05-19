'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  computeArrivalGroups,
  displayStationName,
  favoriteKey,
  formatMinutesAway,
  indexMetraTripUpdates,
  LINE_COLORS,
  stationCardSubheader,
  summarizeCompact,
  type ArrivalGroup,
  type Favorite,
  type FavoriteDensity,
  type Line,
  type Station,
} from '@ctt/shared'
import { favoriteRoute } from '@lib/favoriteRoute'
import { useStationScheduleQuery, useStationTripsQuery } from '@lib/hooks/useDashboardQueries'
import { useMetraFeed } from '@lib/hooks/useMetraFeed'
import FavoriteMenu from '../FavoriteMenu'
import CardMenuButton from './CardMenuButton'
import { cardLink, cardRow, cardRowDragging, cardSubtitle, cardTitle } from './cardClassNames'

interface StationCardProps {
  favorite: Favorite
  station: Station | undefined
  lines: Line[] | undefined
}

function isMetraStation(station: Station | undefined): boolean {
  return station?.service === 'metra' || station?.service === 'both'
}

export default function StationCard({ favorite, station, lines }: StationCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: favoriteKey(favorite.type, favorite.id),
  })

  const slug = station?.slug ?? null
  const metra = isMetraStation(station)
  const scheduleQuery = useStationScheduleQuery(slug)
  const tripsQuery = useStationTripsQuery(slug, metra)

  const metraStopId = station?.metraStopId ?? null
  const realtimeEnabled = metra && !!metraStopId
  const { data: feedData, fetchedAt } = useMetraFeed('tripupdates', { enabled: realtimeEnabled })

  // Tick a `now` value once a minute so minutes-until refreshes without a re-fetch.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const density: FavoriteDensity = favorite.density ?? 'expanded'
  const directionFilter = favorite.directionFilter ?? 'all'

  const realtime = realtimeEnabled ? indexMetraTripUpdates(feedData) : null

  const groups = computeArrivalGroups({
    schedule: scheduleQuery.data ?? null,
    trips: metra ? (tripsQuery.data ?? null) : null,
    now,
    service: metra ? 'metra' : 'cta',
    directionFilter,
    limit: density === 'compact' ? 2 : 3,
    realtime,
    metraStopId,
  })

  const hasLiveRow = groups.some((g) => g.items.some((it) => it.isLive || it.isCancelled))

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const href = station ? favoriteRoute(favorite, lines, [station]) : null
  const title = displayStationName(station?.name) ?? favorite.id
  const subtitle = station
    ? stationCardSubheader(metra ? 'metra' : 'cta', station.lines ?? [])
    : null

  const headerContent = (
    <div className="min-w-0 flex-1">
      <p className={cardTitle}>{title}</p>
      {subtitle && <p className={cardSubtitle}>{subtitle}</p>}
    </div>
  )

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={[cardRow, 'flex-col items-stretch', isDragging ? cardRowDragging : ''].join(' ')}
    >
      <div className="flex w-full items-center justify-between gap-3">
        {href ? (
          <Link href={href} className={cardLink} {...attributes} {...listeners}>
            {headerContent}
          </Link>
        ) : (
          <div className={cardLink} {...attributes} {...listeners}>
            {headerContent}
          </div>
        )}
        {hasLiveRow && (
          <span
            role="status"
            aria-label="Receiving live data"
            className="flex shrink-0 items-center gap-1.5"
          >
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />
            <span className="text-xs font-semibold text-green-600 dark:text-green-400">Live</span>
          </span>
        )}
        <CardMenuButton
          onPress={() => setMenuOpen((v) => !v)}
          isOpen={menuOpen}
          accessibilityLabel={`Open menu for ${title}`}
        />
        {menuOpen && (
          <FavoriteMenu
            favorite={favorite}
            lines={lines}
            stations={station ? [station] : undefined}
            schedule={scheduleQuery.data ?? null}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </div>
      {station && (
        <div className="-mx-4 mt-3 -mb-4">
          <ArrivalsBody
            density={density}
            groups={groups}
            loading={scheduleQuery.isLoading}
            hasSchedule={scheduleQuery.data !== null && scheduleQuery.data !== undefined}
            lastUpdated={hasLiveRow ? fetchedAt : null}
          />
        </div>
      )}
    </li>
  )
}

interface ArrivalsBodyProps {
  density: FavoriteDensity
  groups: ArrivalGroup[]
  loading: boolean
  hasSchedule: boolean
  /** Epoch ms of the last realtime fetch when any row is live; null otherwise. */
  lastUpdated: number | null
}

function formatLastUpdated(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/** First arrival in a group that carries train identity (Metra, matched). */
function firstTrainItem(g: ArrivalGroup) {
  return g.items.find((it) => it.lineSlug && it.trainNumber)
}

function ArrivalsBody({ density, groups, loading, hasSchedule, lastUpdated }: ArrivalsBodyProps) {
  if (loading) {
    return (
      <div data-testid="arrivals-skeleton" className="space-y-1.5 px-4 pb-4">
        <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    )
  }

  if (!hasSchedule) {
    return (
      <p className="px-4 pb-4 text-xs text-gray-500 dark:text-gray-400">
        Schedule data unavailable for this station.
      </p>
    )
  }

  if (groups.length === 0) {
    return (
      <p className="px-4 pb-4 text-xs text-gray-500 dark:text-gray-400">No upcoming departures.</p>
    )
  }

  // Metra GTFS-RT license requires a visible last-updated timestamp wherever
  // realtime data is shown. The green "Live" badge moved to the card header;
  // this de-emphasized footnote keeps us compliant.
  const updatedFootnote = lastUpdated != null && (
    <p className="px-4 pt-2 pb-3 text-[11px] text-gray-500 dark:text-gray-400">
      Updated {formatLastUpdated(lastUpdated)}
    </p>
  )

  if (density === 'compact') {
    return (
      <div className="pb-2">
        <ul className="space-y-1.5 px-4">
          {groups.map((g) => {
            const train = firstTrainItem(g)
            const inner = (
              <>
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: LINE_COLORS[g.line]?.bg ?? '#565a5c' }}
                />
                <span className="font-medium text-gray-900 dark:text-white">{g.headsign}</span>
                <span className="text-gray-500 dark:text-gray-400">·</span>
                <span className="text-gray-600 tabular-nums dark:text-gray-300">
                  {g.items.some((it) => it.isCancelled) && !g.items.some((it) => !it.isCancelled)
                    ? 'Cancelled'
                    : summarizeCompact(g, 2)}
                </span>
              </>
            )
            return (
              <li
                key={g.headsign}
                className="flex items-center gap-2 text-base"
                data-testid="arrival-row-compact"
              >
                {train?.lineSlug && train.trainNumber ? (
                  <Link
                    href={`/metra/${train.lineSlug}/train/${train.trainNumber}`}
                    className="flex flex-1 items-center gap-2 hover:underline"
                  >
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            )
          })}
        </ul>
        {updatedFootnote}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-b-lg border-t border-gray-100 dark:border-gray-700">
      {groups.map((g) => {
        const bg = LINE_COLORS[g.line]?.bg ?? '#565a5c'
        return (
          <div key={g.headsign} data-testid="arrival-group">
            <div className="bg-gray-600 px-4 py-2 dark:bg-gray-700">
              <p className="text-sm font-semibold text-white">Service toward {g.headsign}</p>
            </div>
            {g.items.map((item, i) => {
              const inner = (
                <>
                  <div>
                    <p className="text-xs text-white/80">
                      {g.line} Line · {item.label} to
                    </p>
                    <p className="text-base leading-tight font-bold text-white">{g.headsign}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {item.isCancelled ? (
                      <span className="rounded bg-red-500/20 px-2 py-0.5 text-sm font-bold text-red-200">
                        Cancelled
                      </span>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-white tabular-nums">
                          {formatMinutesAway(item.minutesAway)}
                        </span>
                        {item.isLive ? (
                          <span
                            className="relative flex h-2.5 w-2.5"
                            title="Live — based on Metra realtime data"
                          >
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70 opacity-75" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                          </span>
                        ) : (
                          <span className="text-lg text-white/60" title="Scheduled estimate">
                            ≈
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </>
              )
              const rowClass =
                'flex items-center justify-between border-t border-black/10 px-4 py-3 [text-shadow:0_1px_2px_rgb(0_0_0_/_45%)]'
              return item.lineSlug && item.trainNumber ? (
                <Link
                  key={i}
                  href={`/metra/${item.lineSlug}/train/${item.trainNumber}`}
                  className={`${rowClass} transition hover:brightness-110`}
                  style={{ backgroundColor: bg }}
                  data-testid="arrival-row"
                >
                  {inner}
                </Link>
              ) : (
                <div
                  key={i}
                  className={rowClass}
                  style={{ backgroundColor: bg }}
                  data-testid="arrival-row"
                >
                  {inner}
                </div>
              )
            })}
          </div>
        )
      })}
      {updatedFootnote}
    </div>
  )
}
