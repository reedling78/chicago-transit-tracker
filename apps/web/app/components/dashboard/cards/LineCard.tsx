'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Favorite, Line } from '@ctt/shared'
import { favoriteKey } from '@ctt/shared'
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

interface LineCardProps {
  favorite: Favorite
  line: Line | undefined
  lines: Line[] | undefined
}

export default function LineCard({ favorite, line, lines }: LineCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: favoriteKey(favorite.type, favorite.id),
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    borderLeft: line ? `4px solid ${line.color}` : undefined,
  }

  const href = line ? `/${line.service}/${line.slug}` : null
  const title = line?.name ?? favorite.id
  const subtitle = line?.termini?.length ? line.termini.join(' — ') : null
  const meta = line?.service === 'metra' ? 'Metra' : line ? 'CTA' : null

  const content = (
    <>
      <div className="min-w-0">
        <p className={cardTitle}>{title}</p>
        {subtitle && <p className={cardSubtitle}>{subtitle}</p>}
      </div>
    </>
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
          stations={undefined}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </li>
  )
}
