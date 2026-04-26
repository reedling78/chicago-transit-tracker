'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Favorite, Line, Station } from '@ctt/shared'
import { favoriteKey } from '@ctt/shared'
import { useFavoriteTripQuery } from '@lib/hooks/useDashboardQueries'
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

interface TrainCardProps {
  favorite: Favorite
  lines: Line[] | undefined
  stations: Station[] | undefined
}

export default function TrainCard({ favorite, lines, stations }: TrainCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: favoriteKey(favorite.type, favorite.id),
  })
  const { data: trip } = useFavoriteTripQuery(favorite.id)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const [lineSlug, trainNumberFromId] = favorite.id.split('_')
  const trainNumber = trip?.trainNumber ?? trainNumberFromId ?? favorite.id
  const title = `Train ${trainNumber}`
  const subtitle = trip
    ? trip.headsign
      ? `To ${trip.headsign}`
      : (trip.lineName ?? lineSlug)
    : 'Trip not currently scheduled'
  const meta = trip?.serviceType ?? null
  const href = `/metra/${lineSlug}/train/${trainNumber}`

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={[cardRow, isDragging ? cardRowDragging : ''].join(' ')}
    >
      <Link href={href} className={cardLink} {...attributes} {...listeners}>
        <div className="min-w-0">
          <p className={cardTitle}>{title}</p>
          <p className={cardSubtitle}>{subtitle}</p>
        </div>
      </Link>
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
          stations={stations}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </li>
  )
}
