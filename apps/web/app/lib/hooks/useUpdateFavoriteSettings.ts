'use client'

import { useMutation } from '@tanstack/react-query'
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@lib/firebase-client'
import { useAuth } from '@components/AuthProvider'
import { useFavoritesStore, type FavoriteSettingsPatch } from '@lib/store/favorites'
import { favoriteKey, type FavoriteType } from '@ctt/shared'

interface UseUpdateFavoriteSettingsResult {
  update: (patch: FavoriteSettingsPatch) => void
  isUpdating: boolean
}

interface MutationVariables {
  patch: FavoriteSettingsPatch
  previous: FavoriteSettingsPatch
}

export function useUpdateFavoriteSettings(
  type: FavoriteType,
  id: string,
): UseUpdateFavoriteSettingsResult {
  const { user } = useAuth()

  const mutation = useMutation({
    mutationFn: async ({ patch }: MutationVariables) => {
      if (!user) return // Anonymous: store-only update; nothing to persist.
      const profileRef = doc(db, 'profiles', user.uid)
      const key = favoriteKey(type, id)
      const updates: Record<string, unknown> = { updatedAt: serverTimestamp() }
      if (patch.directionFilter !== undefined) {
        updates[`favorites.${key}.directionFilter`] = patch.directionFilter
      }
      if (patch.density !== undefined) {
        updates[`favorites.${key}.density`] = patch.density
      }
      if (patch.trainOriginStopSlug !== undefined) {
        updates[`favorites.${key}.trainOriginStopSlug`] = patch.trainOriginStopSlug
      }
      if (patch.trainDestinationStopSlug !== undefined) {
        updates[`favorites.${key}.trainDestinationStopSlug`] = patch.trainDestinationStopSlug
      }
      await updateDoc(profileRef, updates)
    },
    onSettled: () => {
      if (user) useFavoritesStore.getState().decrementPendingWrites()
    },
    onError: (err, variables) => {
      // Revert the optimistic update.
      useFavoritesStore.getState().updateSettings(type, id, variables.previous)
      console.error('Failed to update favorite settings:', err)
    },
  })

  function update(patch: FavoriteSettingsPatch) {
    const current = useFavoritesStore
      .getState()
      .favorites.find((f) => f.type === type && f.id === id)
    if (!current) return
    const previous: FavoriteSettingsPatch = {}
    if (patch.directionFilter !== undefined) previous.directionFilter = current.directionFilter
    if (patch.density !== undefined) previous.density = current.density
    if (patch.trainOriginStopSlug !== undefined)
      previous.trainOriginStopSlug = current.trainOriginStopSlug
    if (patch.trainDestinationStopSlug !== undefined)
      previous.trainDestinationStopSlug = current.trainDestinationStopSlug

    useFavoritesStore.getState().updateSettings(type, id, patch)
    if (user) {
      useFavoritesStore.getState().incrementPendingWrites()
      mutation.mutate({ patch, previous })
    }
  }

  return { update, isUpdating: mutation.isPending }
}
