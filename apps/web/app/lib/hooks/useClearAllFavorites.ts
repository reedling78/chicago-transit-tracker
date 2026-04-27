'use client'

import { useMutation } from '@tanstack/react-query'
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@lib/firebase-client'
import { useAuth } from '@components/AuthProvider'
import { useFavoritesStore } from '@lib/store/favorites'
import type { Favorite } from '@ctt/shared'

interface UseClearAllFavoritesResult {
  clearAll: () => void
  isClearing: boolean
  needsAuth: boolean
}

export function useClearAllFavorites(): UseClearAllFavoritesResult {
  const { user } = useAuth()

  const mutation = useMutation({
    mutationFn: async (snapshot: Favorite[]) => {
      if (!user) throw new Error('Cannot clear favorites while signed out')
      void snapshot
      const profileRef = doc(db, 'profiles', user.uid)
      await updateDoc(profileRef, {
        favorites: {},
        updatedAt: serverTimestamp(),
      })
    },
    onSettled: () => {
      useFavoritesStore.getState().decrementPendingWrites()
    },
    onError: (err, snapshot) => {
      // Restore the local list if the Firestore write failed; the live
      // profile snapshot will reconcile shortly after.
      useFavoritesStore.getState().hydrate(snapshot)
      console.error('Failed to clear favorites:', err)
    },
  })

  function clearAll() {
    if (!user) return
    const snapshot = useFavoritesStore.getState().favorites
    if (snapshot.length === 0) return
    useFavoritesStore.setState({ favorites: [] })
    useFavoritesStore.getState().incrementPendingWrites()
    mutation.mutate(snapshot)
  }

  return {
    clearAll,
    isClearing: mutation.isPending,
    needsAuth: !user,
  }
}
