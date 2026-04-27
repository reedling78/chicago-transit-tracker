'use client'

import type { Favorite, Line, Station } from '@ctt/shared'
import { favoriteKey } from '@ctt/shared'
import FavoriteRow from './FavoriteRow'

interface FavoritesSectionProps {
  title: string
  favorites: Favorite[]
  lines: Line[] | undefined
  stations: Station[] | undefined
}

export default function FavoritesSection({
  title,
  favorites,
  lines,
  stations,
}: FavoritesSectionProps) {
  if (favorites.length === 0) return null
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
        {title}
      </h3>
      <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
        {favorites.map((fav) => (
          <FavoriteRow
            key={favoriteKey(fav.type, fav.id)}
            favorite={fav}
            lines={lines}
            stations={stations}
          />
        ))}
      </ul>
    </div>
  )
}
