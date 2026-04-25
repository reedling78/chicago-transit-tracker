'use client'

import { useFavoritesStore } from '@lib/store/favorites'
import { useAuth } from '@components/AuthProvider'
import { useFavoriteTripQuery } from '@lib/hooks/useDashboardQueries'
import LinkCard from '@components/LinkCard'

interface RowProps {
  tripId: string
}

function FavoriteTrainRow({ tripId }: RowProps) {
  const { data: trip } = useFavoriteTripQuery(tripId)
  if (!trip) {
    return (
      <LinkCard
        href={`/metra/${tripId.split('_')[0]}/train/${tripId.split('_')[1] ?? ''}`}
        title={`Train ${tripId.split('_')[1] ?? tripId}`}
        subtitle="Trip not currently scheduled"
        meta="Metra"
      />
    )
  }
  const lineSlug = tripId.split('_')[0]
  return (
    <LinkCard
      href={`/metra/${lineSlug}/train/${trip.trainNumber}`}
      title={`Train ${trip.trainNumber}`}
      subtitle={trip.headsign ? `To ${trip.headsign}` : (trip.lineName ?? lineSlug)}
      meta={trip.serviceType}
    />
  )
}

export default function FavoriteTrains() {
  const { user, loading } = useAuth()
  const favorites = useFavoritesStore((s) => s.favorites)
  const trainFavorites = favorites.filter((f) => f.type === 'train')

  if (loading) return null

  return (
    <section aria-labelledby="favorite-trains-heading" className="mb-8">
      <h2
        id="favorite-trains-heading"
        className="mb-3 text-lg font-semibold text-gray-900 dark:text-white"
      >
        Favorite Trains
      </h2>
      {!user && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Sign in to save your favorite trains.
        </p>
      )}
      {user && trainFavorites.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Tap the heart on a train page to save it here.
        </p>
      )}
      {user && trainFavorites.length > 0 && (
        <ul className="space-y-2">
          {trainFavorites.map((fav) => (
            <li key={fav.id}>
              <FavoriteTrainRow tripId={fav.id} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
