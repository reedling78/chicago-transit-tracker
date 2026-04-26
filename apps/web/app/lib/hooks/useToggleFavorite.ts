'use client'

import { useMutation } from '@tanstack/react-query'
import { deleteField, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@lib/firebase-client'
import { useAuth } from '@components/AuthProvider'
import { useFavoritesStore } from '@lib/store/favorites'
import { favoriteKey, type Favorite, type FavoriteType } from '@ctt/shared'

interface UseToggleFavoriteResult {
  isFavorited: boolean
  toggle: () => void
  isToggling: boolean
  needsAuth: boolean
}

type FavoritePayload = { type: FavoriteType; id: string; addedAt: string; position?: number }
type Variables = { kind: 'add'; payload: FavoritePayload } | { kind: 'remove' }

export function useToggleFavorite(type: FavoriteType, id: string): UseToggleFavoriteResult {
  const { user } = useAuth()
  const isFavorited = useFavoritesStore((s) => s.has(type, id))

  const mutation = useMutation({
    mutationFn: async (variables: Variables) => {
      if (!user) throw new Error('Cannot write favorites while signed out')
      const profileRef = doc(db, 'profiles', user.uid)
      const key = favoriteKey(type, id)
      if (variables.kind === 'add') {
        const { type: t, id: i, addedAt, position } = variables.payload
        const value: FavoritePayload =
          typeof position === 'number'
            ? { type: t, id: i, addedAt, position }
            : { type: t, id: i, addedAt }
        await updateDoc(profileRef, {
          [`favorites.${key}`]: value,
          updatedAt: serverTimestamp(),
        })
      } else {
        await updateDoc(profileRef, {
          [`favorites.${key}`]: deleteField(),
          updatedAt: serverTimestamp(),
        })
      }
    },
    onSettled: () => {
      useFavoritesStore.getState().decrementPendingWrites()
    },
    onError: (err, variables) => {
      if (variables.kind === 'add') {
        useFavoritesStore.getState().removeOptimistic(type, id)
      } else {
        useFavoritesStore.getState().addOptimistic(type, id)
      }
      console.error('Failed to write favorite:', err)
    },
  })

  function toggle() {
    if (!user) return
    if (isFavorited) {
      useFavoritesStore.getState().removeOptimistic(type, id)
      useFavoritesStore.getState().incrementPendingWrites()
      mutation.mutate({ kind: 'remove' })
    } else {
      const fav: Favorite = useFavoritesStore.getState().addOptimistic(type, id)
      const payload: FavoritePayload = { type, id, addedAt: fav.addedAt }
      if (typeof fav.position === 'number') payload.position = fav.position
      useFavoritesStore.getState().incrementPendingWrites()
      mutation.mutate({ kind: 'add', payload })
    }
  }

  return {
    isFavorited,
    toggle,
    isToggling: mutation.isPending,
    needsAuth: !user,
  }
}
