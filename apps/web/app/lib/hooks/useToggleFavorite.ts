'use client'

import { useMutation } from '@tanstack/react-query'
import { deleteField, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@lib/firebase-client'
import { useAuth } from '@components/AuthProvider'
import { useFavoritesStore } from '@lib/store/favorites'
import { favoriteKey, type FavoriteType } from '@ctt/shared'

interface UseToggleFavoriteResult {
  isFavorited: boolean
  toggle: () => void
  isToggling: boolean
  needsAuth: boolean
}

type Variables = { kind: 'add'; addedAt: string } | { kind: 'remove' }

export function useToggleFavorite(type: FavoriteType, id: string): UseToggleFavoriteResult {
  const { user } = useAuth()
  const isFavorited = useFavoritesStore((s) => s.has(type, id))

  const mutation = useMutation({
    mutationFn: async (variables: Variables) => {
      if (!user) throw new Error('Cannot write favorites while signed out')
      const profileRef = doc(db, 'profiles', user.uid)
      const key = favoriteKey(type, id)
      if (variables.kind === 'add') {
        await updateDoc(profileRef, {
          [`favorites.${key}`]: { type, id, addedAt: variables.addedAt },
          updatedAt: serverTimestamp(),
        })
      } else {
        await updateDoc(profileRef, {
          [`favorites.${key}`]: deleteField(),
          updatedAt: serverTimestamp(),
        })
      }
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
      mutation.mutate({ kind: 'remove' })
    } else {
      const fav = useFavoritesStore.getState().addOptimistic(type, id)
      mutation.mutate({ kind: 'add', addedAt: fav.addedAt })
    }
  }

  return {
    isFavorited,
    toggle,
    isToggling: mutation.isPending,
    needsAuth: !user,
  }
}
