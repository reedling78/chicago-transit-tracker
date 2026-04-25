'use client'

import { useFavoritesStore } from '@lib/store/favorites'
import { useAuth } from '@components/AuthProvider'
import { useLinesQuery } from '@lib/hooks/useDashboardQueries'
import LinkCard from '@components/LinkCard'

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
        <ul className="space-y-2">
          {lineFavorites.map((fav) => {
            const line = lineMap.get(fav.id)
            if (!line) return null
            return (
              <li key={fav.id}>
                <LinkCard
                  href={`/${line.service}/${line.slug}`}
                  title={line.name}
                  subtitle={line.termini.join(' — ')}
                  meta={line.service === 'metra' ? 'Metra' : 'CTA'}
                  accentColor={line.color}
                />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
