'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  SERVICE_LABEL,
  favoriteKey,
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
import {
  cardPill,
  cardPillRow,
  cardRow,
  cardRowDragging,
  cardSubtitle,
  cardTitle,
} from './cardClassNames'

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
      ? `${originStop.stationName} to ${destStop.stationName}`
      : `Train ${trainNumber}`
    : `Train ${trainNumber}`

  const subtitleFallback = trip
    ? trip.headsign
      ? `To ${trip.headsign}`
      : (trip.lineName ?? lineSlugFromId)
    : 'Trip not currently scheduled'

  const pills: { label: string; tone?: 'line' | 'express' }[] = []
  if (trip) {
    pills.push({ label: 'Metra' })
    if (trip.line) pills.push({ label: trip.line, tone: 'line' })
    if (trip.serviceType && trip.serviceType in SERVICE_LABEL) {
      pills.push({ label: SERVICE_LABEL[trip.serviceType as keyof typeof SERVICE_LABEL] })
    }
    if (trip.isExpress) pills.push({ label: 'Express', tone: 'express' })
  }

  const lineSlug = trip?.lineSlug ?? lineSlugFromId
  const href = `/metra/${lineSlug}/train/${trainNumber}`

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    borderLeft: lineColor ? `4px solid ${lineColor}` : undefined,
  }

  const canPickStops = !!trip?.stops && trip.stops.length > 1

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
        </Link>
        <span className="shrink-0 text-sm text-gray-500 tabular-nums dark:text-gray-400">
          #{trainNumber}
        </span>
        <CardMenuButton
          onPress={() => setMenuOpen((v) => !v)}
          isOpen={menuOpen}
          accessibilityLabel={`Open menu for ${title}`}
        />
      </div>
      {pills.length > 0 ? (
        <div className={cardPillRow}>
          {pills.map((pill, i) => {
            const inlineStyle =
              pill.tone === 'line' && lineColor
                ? { backgroundColor: lineColor, color: line?.textColor ?? '#fff' }
                : undefined
            return (
              <span key={`${pill.label}-${i}`} className={cardPill} style={inlineStyle}>
                {pill.label}
              </span>
            )
          })}
        </div>
      ) : (
        <p className={cardSubtitle}>{subtitleFallback}</p>
      )}
      {live && live.status && !live.isNoData && (
        <MetraTripHeroStatusCardCompact
          status={live.status}
          phase={live.phase}
          currentDerived={live.currentDerived}
          firstStop={live.firstStop}
          lastStop={live.lastStop}
          vehiclePosition={live.vehiclePosition}
          nowMs={live.nowMs}
        />
      )}
      {menuOpen && (
        <FavoriteMenu
          favorite={favorite}
          lines={lines}
          stations={stations}
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
