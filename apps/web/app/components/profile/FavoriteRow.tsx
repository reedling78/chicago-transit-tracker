'use client'

import Link from 'next/link'
import type { Favorite, Line, Station } from '@ctt/shared'
import { favoriteRoute } from '@lib/favoriteRoute'
import { useToggleFavorite } from '@lib/hooks/useToggleFavorite'
import { useFavoriteTripQuery } from '@lib/hooks/useDashboardQueries'

interface FavoriteRowProps {
  favorite: Favorite
  lines: Line[] | undefined
  stations: Station[] | undefined
}

export default function FavoriteRow({ favorite, lines, stations }: FavoriteRowProps) {
  const { toggle, isToggling } = useToggleFavorite(favorite.type, favorite.id)
  const { title, subtitle } = useRowContent(favorite, lines, stations)
  const href = favoriteRoute(favorite, lines, stations)

  const inner = (
    <div className="min-w-0 flex-1">
      <p className="truncate font-medium text-gray-900 dark:text-white">{title}</p>
      {subtitle && <p className="truncate text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
    </div>
  )

  return (
    <li className="flex items-center gap-3 bg-white px-4 py-3 dark:bg-gray-900">
      {href ? (
        <Link
          href={href}
          className="flex min-w-0 flex-1 items-center gap-3 outline-none hover:text-blue-600 dark:hover:text-blue-400"
        >
          {inner}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{inner}</div>
      )}
      <button
        type="button"
        onClick={toggle}
        disabled={isToggling}
        aria-label={`Remove ${title} from favorites`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
      >
        <TrashIcon />
      </button>
    </li>
  )
}

function useRowContent(
  favorite: Favorite,
  lines: Line[] | undefined,
  stations: Station[] | undefined,
) {
  const isTrain = favorite.type === 'train'
  const { data: trip } = useFavoriteTripQuery(isTrain ? favorite.id : null)

  if (favorite.type === 'line') {
    const line = lines?.find((l) => l.slug === favorite.id)
    return {
      title: line?.name ?? favorite.id,
      subtitle: line?.termini?.length ? line.termini.join(' — ') : null,
    }
  }
  if (favorite.type === 'station') {
    const station = stations?.find((s) => s.slug === favorite.id)
    return {
      title: station?.name ?? favorite.id,
      subtitle: station?.lines?.length ? station.lines.join(' • ') : null,
    }
  }
  // train
  const [lineSlug, trainNumberFromId] = favorite.id.split('_')
  const trainNumber = trip?.trainNumber ?? trainNumberFromId ?? favorite.id
  const subtitle = trip
    ? trip.headsign
      ? `To ${trip.headsign}`
      : (trip.lineName ?? lineSlug)
    : 'Trip not currently scheduled'
  return { title: `Train ${trainNumber}`, subtitle }
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443A48.4 48.4 0 0 0 3.04 4.5a.75.75 0 0 0 0 1.5h.075l.812 11.358A2.75 2.75 0 0 0 6.671 20h6.658a2.75 2.75 0 0 0 2.744-2.642L16.885 6h.075a.75.75 0 0 0 0-1.5 48.4 48.4 0 0 0-2.96-.307v-.443A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.563 0 1.118.014 1.668.041V3.75A1.25 1.25 0 0 0 10.418 2.5h-2.5A1.25 1.25 0 0 0 6.668 3.75v.291C7.218 4.014 7.773 4 8.336 4H10Zm-2.677 4.5a.75.75 0 1 0-1.496.067l.31 6.5a.75.75 0 1 0 1.499-.07l-.31-6.5Zm5.358.067a.75.75 0 1 0-1.497-.067l-.31 6.5a.75.75 0 1 0 1.499.07l.308-6.503Z"
        clipRule="evenodd"
      />
    </svg>
  )
}
