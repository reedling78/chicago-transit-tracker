'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Favorite, FavoriteType } from '@ctt/shared'

interface FavoritesState {
  /** Favorites sorted by addedAt desc. */
  favorites: Favorite[]
  /** True after the first hydrate from a remote profile snapshot. */
  hydrated: boolean
  hydrate: (favorites: Favorite[]) => void
  addOptimistic: (type: FavoriteType, id: string) => Favorite
  removeOptimistic: (type: FavoriteType, id: string) => void
  has: (type: FavoriteType, id: string) => boolean
  clear: () => void
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      hydrated: false,
      hydrate: (favorites) => set({ favorites, hydrated: true }),
      addOptimistic: (type, id) => {
        const fav: Favorite = { type, id, addedAt: new Date().toISOString() }
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
      has: (type, id) => get().favorites.some((f) => f.type === type && f.id === id),
      clear: () => set({ favorites: [], hydrated: false }),
    }),
    {
      name: 'ctt-favorites',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? window.localStorage : ({} as Storage),
      ),
      partialize: (state) => ({ favorites: state.favorites }),
    },
  ),
)
