import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Favorite, FavoriteType, FavoriteDensity, FavoriteDirection } from '@ctt/shared'

/** Subset of Favorite fields that can be updated via `updateSettings`. */
export type FavoriteSettingsPatch = {
  directionFilter?: FavoriteDirection
  density?: FavoriteDensity
  trainOriginStopSlug?: string
  trainDestinationStopSlug?: string
}

/** Reorder positions are written as a dense sequence (1000, 2000, 3000, ...). */
export const REORDER_POSITION_STEP = 1000

interface FavoritesState {
  /**
   * Favorites in their effective sort order (position asc, then addedAt desc for un-positioned).
   * Mirrors what `@ctt/shared`'s `mapToArray` produces from a Firestore snapshot.
   */
  favorites: Favorite[]
  /** True after the first hydrate from a remote profile snapshot. */
  hydrated: boolean
  /**
   * Number of in-flight Firestore writes initiated by the local store.
   * While >0, snapshot handlers should skip `hydrate` to avoid clobbering
   * an unconfirmed optimistic update with stale server data.
   */
  pendingWrites: number
  hydrate: (favorites: Favorite[]) => void
  addOptimistic: (type: FavoriteType, id: string) => Favorite
  removeOptimistic: (type: FavoriteType, id: string) => void
  /**
   * Replace the favorites list with a new ordering, stamping each item's
   * `position` to its index in the new order (1000, 2000, ...). Used by the
   * mobile drag-to-reorder UI; the same positions are persisted to Firestore.
   */
  reorder: (newOrder: Favorite[]) => void
  /**
   * Merge a partial settings patch into the matching favorite. Used by the
   * dashboard card menu to update `directionFilter` / `density`. No-op if no
   * favorite with the given type+id exists in the store.
   */
  updateSettings: (type: FavoriteType, id: string, patch: FavoriteSettingsPatch) => void
  has: (type: FavoriteType, id: string) => boolean
  clear: () => void
  incrementPendingWrites: () => void
  decrementPendingWrites: () => void
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      hydrated: false,
      pendingWrites: 0,
      hydrate: (favorites) => set({ favorites, hydrated: true }),
      addOptimistic: (type, id) => {
        const fav: Favorite = computeNewFavorite(type, id, get().favorites)
        set((state) => {
          const filtered = state.favorites.filter((f) => f.type !== type || f.id !== id)
          return { favorites: [fav, ...filtered] }
        })
        return fav
      },
      removeOptimistic: (type, id) => {
        set((state) => ({
          favorites: state.favorites.filter((f) => f.type !== type || f.id !== id),
        }))
      },
      reorder: (newOrder) => {
        const repositioned = newOrder.map((fav, index) => ({
          ...fav,
          position: (index + 1) * REORDER_POSITION_STEP,
        }))
        set({ favorites: repositioned })
      },
      updateSettings: (type, id, patch) => {
        set((state) => ({
          favorites: state.favorites.map((f) =>
            f.type === type && f.id === id ? { ...f, ...patch } : f,
          ),
        }))
      },
      has: (type, id) => get().favorites.some((f) => f.type === type && f.id === id),
      clear: () => set({ favorites: [], hydrated: false, pendingWrites: 0 }),
      incrementPendingWrites: () => set((state) => ({ pendingWrites: state.pendingWrites + 1 })),
      decrementPendingWrites: () =>
        set((state) => ({ pendingWrites: Math.max(0, state.pendingWrites - 1) })),
    }),
    {
      name: 'ctt-favorites',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ favorites: state.favorites }),
    },
  ),
)

/**
 * Build a new Favorite for `addOptimistic`. New items land at the top of the
 * list. If every existing favorite has been positioned (fully reordered user),
 * the new one gets `min(positions) - REORDER_POSITION_STEP` so it slots above
 * them. Otherwise we leave `position` undefined and let `addedAt` (newest-first)
 * place it above the un-positioned items.
 */
function computeNewFavorite(type: FavoriteType, id: string, existing: Favorite[]): Favorite {
  const fav: Favorite = { type, id, addedAt: new Date().toISOString() }
  if (existing.length === 0) return fav
  const positions = existing
    .map((f) => f.position)
    .filter((p): p is number => typeof p === 'number')
  if (positions.length !== existing.length) return fav
  return { ...fav, position: Math.min(...positions) - REORDER_POSITION_STEP }
}
