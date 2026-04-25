'use client'

import { useFavoritesStore } from '@lib/store/favorites'
import { useAuth } from '@components/AuthProvider'
import { useLinesQuery, useStationsQuery } from '@lib/hooks/useDashboardQueries'
import LinkCard from '@components/LinkCard'

export default function FavoriteStations() {
  const { user, loading } = useAuth()
  const favorites = useFavoritesStore((s) => s.favorites)
  const { data: stations } = useStationsQuery()
  const { data: lines } = useLinesQuery()

  const stationFavorites = favorites.filter((f) => f.type === 'station')
  const stationMap = new Map((stations ?? []).map((s) => [s.slug, s]))
  const lineByShortName = new Map((lines ?? []).map((l) => [l.shortName, l]))

  if (loading) return null

  return (
    <section aria-labelledby="favorite-stations-heading" className="mb-8">
      <h2
        id="favorite-stations-heading"
        className="mb-3 text-lg font-semibold text-gray-900 dark:text-white"
      >
        Favorite Stations
      </h2>
      {!user && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Sign in to save your favorite stations.
        </p>
      )}
      {user && stationFavorites.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Tap the heart on a station to save it here.
        </p>
      )}
      {user && stationFavorites.length > 0 && (
        <ul className="space-y-2">
          {stationFavorites.map((fav) => {
            const station = stationMap.get(fav.id)
            if (!station) return null
            const firstLineShort = station.lines[0]
            const line = firstLineShort ? lineByShortName.get(firstLineShort) : undefined
            const href = line
              ? `/${line.service}/${line.slug}/${station.slug}`
              : `/${station.service === 'metra' ? 'metra' : 'cta'}`
            return (
              <li key={fav.id}>
                <LinkCard
                  href={href}
                  title={station.name}
                  subtitle={station.lines.join(' • ')}
                  meta={station.service === 'metra' ? 'Metra' : 'CTA'}
                />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
