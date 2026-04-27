'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  computeArrivalGroups,
  favoriteKey,
  formatMinutesAway,
  LINE_COLORS,
  summarizeCompact,
  type ArrivalGroup,
  type Favorite,
  type FavoriteDensity,
  type Line,
  type Station,
} from '@ctt/shared'
import { favoriteRoute } from '@lib/favoriteRoute'
import { useStationScheduleQuery, useStationTripsQuery } from '@lib/hooks/useDashboardQueries'
import FavoriteMenu from '../FavoriteMenu'
import CardMenuButton from './CardMenuButton'
import {
  cardLink,
  cardMeta,
  cardRow,
  cardRowDragging,
  cardSubtitle,
  cardTitle,
} from './cardClassNames'

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

  // Tick a `now` value once a minute so minutes-until refreshes without a re-fetch.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const density: FavoriteDensity = favorite.density ?? 'expanded'
  const directionFilter = favorite.directionFilter ?? 'all'

  const groups = computeArrivalGroups({
    schedule: scheduleQuery.data ?? null,
    trips: metra ? (tripsQuery.data ?? null) : null,
    now,
    service: metra ? 'metra' : 'cta',
    directionFilter,
    limit: density === 'compact' ? 2 : 3,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const href = station ? favoriteRoute(favorite, lines, [station]) : null
  const title = station?.name ?? favorite.id
  const subtitle = station?.lines?.length ? station.lines.join(' • ') : null
  const meta = station ? (metra ? 'Metra' : 'CTA') : null

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
        {meta && <span className={cardMeta}>{meta}</span>}
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
}

function ArrivalsBody({ density, groups, loading, hasSchedule }: ArrivalsBodyProps) {
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

  if (density === 'compact') {
    return (
      <ul className="space-y-1.5 px-4 pb-4">
        {groups.map((g) => (
          <li
            key={g.headsign}
            className="flex items-center gap-2 text-sm"
            data-testid="arrival-row-compact"
          >
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: LINE_COLORS[g.line]?.bg ?? '#565a5c' }}
            />
            <span className="font-medium text-gray-900 dark:text-white">{g.headsign}</span>
            <span className="text-gray-500 dark:text-gray-400">·</span>
            <span className="text-gray-600 tabular-nums dark:text-gray-300">
              {summarizeCompact(g, 2)}
            </span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="overflow-hidden rounded-b-lg border-t border-gray-100 dark:border-gray-700">
      {groups.map((g) => {
        const bg = LINE_COLORS[g.line]?.bg ?? '#565a5c'
        return (
          <div key={g.headsign} data-testid="arrival-group">
            <div className="bg-gray-100 px-4 py-1 text-[11px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              Toward {g.headsign}
            </div>
            {g.items.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-1.5 text-sm text-white"
                style={{ backgroundColor: bg }}
                data-testid="arrival-row"
              >
                <span className="text-xs text-white/80">
                  {g.line} · {item.label}
                </span>
                <span className="font-bold tabular-nums">
                  {formatMinutesAway(item.minutesAway)}
                </span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
