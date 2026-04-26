'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Favorite, Line, Station } from '@ctt/shared'
import { favoriteKey } from '@ctt/shared'
import { favoriteRoute } from '@lib/favoriteRoute'
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

export default function StationCard({ favorite, station, lines }: StationCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: favoriteKey(favorite.type, favorite.id),
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const href = station ? favoriteRoute(favorite, lines, [station]) : null
  const title = station?.name ?? favorite.id
  const subtitle = station?.lines?.length ? station.lines.join(' • ') : null
  const meta = station ? (station.service === 'metra' ? 'Metra' : 'CTA') : null

  const content = (
    <div className="min-w-0">
      <p className={cardTitle}>{title}</p>
      {subtitle && <p className={cardSubtitle}>{subtitle}</p>}
    </div>
  )

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={[cardRow, isDragging ? cardRowDragging : ''].join(' ')}
    >
      {href ? (
        <Link href={href} className={cardLink} {...attributes} {...listeners}>
          {content}
        </Link>
      ) : (
        <div className={cardLink} {...attributes} {...listeners}>
          {content}
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
          onClose={() => setMenuOpen(false)}
        />
      )}
    </li>
  )
}
