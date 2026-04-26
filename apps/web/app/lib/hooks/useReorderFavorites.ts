'use client'

import { useMutation } from '@tanstack/react-query'
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@lib/firebase-client'
import { useAuth } from '@components/AuthProvider'
import { REORDER_POSITION_STEP, useFavoritesStore } from '@lib/store/favorites'
import { favoriteKey, type Favorite } from '@ctt/shared'

interface UseReorderFavoritesResult {
  reorder: (newOrder: Favorite[]) => void
  isReordering: boolean
}

export function useReorderFavorites(): UseReorderFavoritesResult {
  const { user } = useAuth()

  const mutation = useMutation({
    mutationFn: async (newOrder: Favorite[]) => {
      if (!user) throw new Error('Cannot reorder favorites while signed out')
      const profileRef = doc(db, 'profiles', user.uid)
      const updates: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      }
      newOrder.forEach((fav, index) => {
        const key = favoriteKey(fav.type, fav.id)
        updates[`favorites.${key}.position`] = (index + 1) * REORDER_POSITION_STEP
      })
      await updateDoc(profileRef, updates)
    },
    onSettled: () => {
      useFavoritesStore.getState().decrementPendingWrites()
    },
    onError: (err) => {
      console.error('Failed to reorder favorites:', err)
    },
  })

  function reorder(newOrder: Favorite[]) {
    if (!user) return
    useFavoritesStore.getState().reorder(newOrder)
    useFavoritesStore.getState().incrementPendingWrites()
    mutation.mutate(newOrder)
  }

  return {
    reorder,
    isReordering: mutation.isPending,
  }
}
