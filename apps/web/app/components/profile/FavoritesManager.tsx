'use client'

import { useMemo } from 'react'
import type { Favorite } from '@ctt/shared'
import { useFavoritesStore } from '@lib/store/favorites'
import { useLinesQuery, useStationsQuery } from '@lib/hooks/useDashboardQueries'
import { useClearAllFavorites } from '@lib/hooks/useClearAllFavorites'
import FavoritesSection from './FavoritesSection'

export default function FavoritesManager() {
  const favorites = useFavoritesStore((s) => s.favorites)
  const { data: lines } = useLinesQuery()
  const { data: stations } = useStationsQuery()
  const { clearAll, isClearing } = useClearAllFavorites()

  const groups = useMemo(() => {
    const lineFavs: Favorite[] = []
    const stationFavs: Favorite[] = []
    const trainFavs: Favorite[] = []
    for (const f of favorites) {
      if (f.type === 'line') lineFavs.push(f)
      else if (f.type === 'station') stationFavs.push(f)
      else if (f.type === 'train') trainFavs.push(f)
    }
    return { lineFavs, stationFavs, trainFavs }
  }, [favorites])

  const empty = favorites.length === 0

  function handleClearAll() {
    if (empty) return
    const ok = window.confirm(
      `Remove all ${favorites.length} favorite${favorites.length === 1 ? '' : 's'}? This can't be undone.`,
    )
    if (ok) clearAll()
  }

  return (
    <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Favorites</h2>
        <button
          type="button"
          onClick={handleClearAll}
          disabled={empty || isClearing}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-400 dark:text-red-400 dark:hover:bg-red-900/20 dark:disabled:text-gray-600"
        >
          Clear all
        </button>
      </div>

      {empty ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No favorites yet — tap the heart on any line, station, or train to save it.
        </p>
      ) : (
        <div className="space-y-6">
          <FavoritesSection
            title="Lines"
            favorites={groups.lineFavs}
            lines={lines}
            stations={stations}
          />
          <FavoritesSection
            title="Stations"
            favorites={groups.stationFavs}
            lines={lines}
            stations={stations}
          />
          <FavoritesSection
            title="Trains"
            favorites={groups.trainFavs}
            lines={lines}
            stations={stations}
          />
        </div>
      )}
    </section>
  )
}
