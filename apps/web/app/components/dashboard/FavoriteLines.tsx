'use client'

import Link from 'next/link'
import { useFavoritesStore } from '@lib/store/favorites'
import { useAuth } from '@components/AuthProvider'
import { useLinesQuery } from '@lib/hooks/useDashboardQueries'
import { LINE_COLORS } from '@lib/constants'

export default function FavoriteLines() {
  const { user, loading } = useAuth()
  const favorites = useFavoritesStore((s) => s.favorites)
  const { data: lines } = useLinesQuery()

  const lineFavorites = favorites.filter((f) => f.type === 'line')
  const lineMap = new Map((lines ?? []).map((l) => [l.slug, l]))

  if (loading) return null

  return (
    <section aria-labelledby="favorite-lines-heading" className="mb-8">
      <h2
        id="favorite-lines-heading"
        className="mb-3 text-lg font-semibold text-gray-900 dark:text-white"
      >
        Favorite Lines
      </h2>
      {!user && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Sign in to save your favorite lines.
        </p>
      )}
      {user && lineFavorites.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Tap the heart on a line page to save it here.
        </p>
      )}
      {user && lineFavorites.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {lineFavorites.map((fav) => {
            const line = lineMap.get(fav.id)
            const colors = line ? LINE_COLORS[line.shortName] : undefined
            const display = line?.name ?? fav.id
            const href = line ? `/${line.service}/${line.slug}` : `#`
            const style = colors ? { backgroundColor: colors.bg, color: colors.text } : undefined
            return (
              <Link
                key={fav.id}
                href={href}
                className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:opacity-80 dark:bg-gray-800 dark:text-gray-300"
                style={style}
                aria-label={`${display} line`}
              >
                {display}
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
