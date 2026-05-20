import { useMutation } from '@tanstack/react-query'
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import { useAuth } from './AuthContext'
import { useDashboardStore, type DashboardItemSettingsPatch } from './store/dashboard'
import { dashboardItemKey, type DashboardItemType } from '@ctt/shared'

interface UseUpdateDashboardItemSettingsResult {
  update: (patch: DashboardItemSettingsPatch) => void
  isUpdating: boolean
}

interface MutationVariables {
  patch: DashboardItemSettingsPatch
  previous: DashboardItemSettingsPatch
}

export function useUpdateDashboardItemSettings(
  type: DashboardItemType,
  id: string,
): UseUpdateDashboardItemSettingsResult {
  const { user } = useAuth()

  const mutation = useMutation({
    mutationFn: async ({ patch }: MutationVariables) => {
      if (!user) return
      const profileRef = doc(db, 'profiles', user.uid)
      const key = dashboardItemKey(type, id)
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
      if (user) useDashboardStore.getState().decrementPendingWrites()
    },
    onError: (err, variables) => {
      useDashboardStore.getState().updateSettings(type, id, variables.previous)
      console.error('Failed to update dashboard item settings:', err)
    },
  })

  function update(patch: DashboardItemSettingsPatch) {
    const current = useDashboardStore.getState().items.find((i) => i.type === type && i.id === id)
    if (!current) return
    const previous: DashboardItemSettingsPatch = {}
    if (patch.directionFilter !== undefined) previous.directionFilter = current.directionFilter
    if (patch.density !== undefined) previous.density = current.density
    if (patch.trainOriginStopSlug !== undefined)
      previous.trainOriginStopSlug = current.trainOriginStopSlug
    if (patch.trainDestinationStopSlug !== undefined)
      previous.trainDestinationStopSlug = current.trainDestinationStopSlug

    useDashboardStore.getState().updateSettings(type, id, patch)
    if (user) {
      useDashboardStore.getState().incrementPendingWrites()
      mutation.mutate({ patch, previous })
    }
  }

  return { update, isUpdating: mutation.isPending }
}
