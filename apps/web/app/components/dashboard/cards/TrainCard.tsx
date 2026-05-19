'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  computeDestinationEta,
  computeRightPanel,
  favoriteKey,
  formatClockLabel,
  formatMinutesAway,
  minutesUntil,
  nextServiceRunLabel,
  parseDisplayTimeToMinutes,
  shortenStationName,
  type Favorite,
  type Line,
  type Station,
  type TripStop,
} from '@ctt/shared'
import { useFavoriteTripQuery } from '@lib/hooks/useDashboardQueries'
import { useMetraTripLiveStatus } from '@lib/hooks/useMetraTripLiveStatus'
import { useUpdateFavoriteSettings } from '@lib/hooks/useUpdateFavoriteSettings'
import FavoriteMenu from '../FavoriteMenu'
import MetraTripHeroStatusCardCompact from '../../MetraTripHeroStatusCardCompact'
import TrainStopPickerModal from '../TrainStopPickerModal'
import CardMenuButton from './CardMenuButton'
import { cardRow, cardRowDragging, cardSubtitle, cardTitle } from './cardClassNames'

interface TrainCardProps {
  favorite: Favorite
  lines: Line[] | undefined
  stations: Station[] | undefined
}

/**
 * Pick the trip stop matching `slug`, falling back if missing or unset. The
 * fallback ensures the card renders sensibly when a saved override no longer
 * matches a stop on the current trip (e.g. Metra reroutes).
 */
function pickStop(
  stops: TripStop[] | undefined,
  slug: string | undefined,
  fallback: TripStop | undefined,
): TripStop | undefined {
  if (!stops?.length) return fallback
  if (slug) {
    const match = stops.find((s) => s.slug === slug)
    if (match) return match
  }
  return fallback
}

export default function TrainCard({ favorite, lines, stations }: TrainCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [pickerMode, setPickerMode] = useState<'origin' | 'destination' | null>(null)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: favoriteKey(favorite.type, favorite.id),
  })
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  const { data: trip } = useFavoriteTripQuery(favorite.id)
  const { update } = useUpdateFavoriteSettings(favorite.type, favorite.id)
  const live = useMetraTripLiveStatus(trip ?? null)

  const [lineSlugFromId, trainNumberFromId] = favorite.id.split('_')
  const trainNumber = trip?.trainNumber ?? trainNumberFromId ?? favorite.id
  const line = lines?.find((l) => l.slug === (trip?.lineSlug ?? lineSlugFromId))
  const lineColor = line?.color

  const firstStop = trip?.stops?.[0]
  const lastStop = trip?.stops?.[trip.stops.length - 1]
  const originStop = pickStop(trip?.stops, favorite.trainOriginStopSlug, firstStop)
  const destStop = pickStop(trip?.stops, favorite.trainDestinationStopSlug, lastStop)

  const title = trip
    ? originStop && destStop
      ? `${shortenStationName(originStop.stationName)} to ${shortenStationName(destStop.stationName)}`
      : `Train ${trainNumber}`
    : `Train ${trainNumber}`

  const subheader = trip ? `${trip.line ? `${trip.line} ` : ''}#${trainNumber}` : `#${trainNumber}`

  const lineSlug = trip?.lineSlug ?? lineSlugFromId
  const href = `/metra/${lineSlug}/train/${trainNumber}`

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const canPickStops = !!trip?.stops && trip.stops.length > 1

  const liveShown = !!(live && live.status && !live.isNoData)
  const depMin = originStop ? parseDisplayTimeToMinutes(originStop.departure) : null
  const minsAway = depMin != null ? minutesUntil(now, depMin) : null
  const showCountdown = !liveShown && !!trip && depMin != null

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={[cardRow, '!flex-col !items-stretch', isDragging ? cardRowDragging : ''].join(' ')}
    >
      <div className="flex items-center gap-3">
        <Link
          href={href}
          className="min-w-0 flex-1 touch-none outline-none"
          {...attributes}
          {...listeners}
        >
          <p className={cardTitle}>{title}</p>
          <p className={cardSubtitle}>{subheader}</p>
        </Link>
        {liveShown && (
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
      </div>
      {liveShown && live && (
        <MetraTripHeroStatusCardCompact
          status={live.status!}
          vehiclePosition={live.vehiclePosition}
          nextStop={computeRightPanel(
            live.phase,
            live.currentDerived,
            live.firstStop,
            live.lastStop,
            live.nowMs,
          )}
          destination={computeDestinationEta(destStop, live.derivedStops, live.nowMs)}
          lineColor={lineColor}
          lineTextColor={line?.textColor}
        />
      )}
      {showCountdown && depMin != null && (
        <p className={cardSubtitle}>
          {minsAway != null && minsAway >= 0 ? (
            <>
              Departs in{' '}
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                {formatMinutesAway(minsAway)}
              </span>{' '}
              · {formatClockLabel(depMin)}
              {originStop ? ` from ${originStop.stationName}` : ''}
            </>
          ) : (
            `Departed ${formatClockLabel(depMin)}${
              trip?.serviceType ? ` · Next train ${nextServiceRunLabel(trip.serviceType, now)}` : ''
            }`
          )}
        </p>
      )}
      {menuOpen && (
        <FavoriteMenu
          favorite={favorite}
          lines={lines}
          stations={stations}
          header={{ title, subtitle: subheader }}
          onSetTrainStop={canPickStops ? (which) => setPickerMode(which) : undefined}
          onClose={() => setMenuOpen(false)}
        />
      )}
      {pickerMode && trip?.stops && (
        <TrainStopPickerModal
          mode={pickerMode}
          stops={trip.stops}
          originSequence={originStop?.sequence ?? trip.stops[0]?.sequence ?? 0}
          destinationSequence={
            destStop?.sequence ?? trip.stops[trip.stops.length - 1]?.sequence ?? Infinity
          }
          currentSlug={
            pickerMode === 'origin' ? (originStop?.slug ?? null) : (destStop?.slug ?? null)
          }
          onSelect={(slug) => {
            update(
              pickerMode === 'origin'
                ? { trainOriginStopSlug: slug }
                : { trainDestinationStopSlug: slug },
            )
            setPickerMode(null)
          }}
          onClose={() => setPickerMode(null)}
        />
      )}
    </li>
  )
}
