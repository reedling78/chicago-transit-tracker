'use client'

import { useMutation } from '@tanstack/react-query'
import { deleteField, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@lib/firebase-client'
import { useAuth } from '@components/AuthProvider'
import { useDashboardStore } from '@lib/store/dashboard'
import { dashboardItemKey, type DashboardItem, type DashboardItemType } from '@ctt/shared'

interface UseToggleDashboardItemResult {
  isOnDashboard: boolean
  toggle: () => void
  isToggling: boolean
  needsAuth: boolean
}

type ItemPayload = { type: DashboardItemType; id: string; addedAt: string; position?: number }
type Variables = { kind: 'add'; payload: ItemPayload } | { kind: 'remove' }

export function useToggleDashboardItem(
  type: DashboardItemType,
  id: string,
): UseToggleDashboardItemResult {
  const { user } = useAuth()
  const isOnDashboard = useDashboardStore((s) => s.has(type, id))

  const mutation = useMutation({
    mutationFn: async (variables: Variables) => {
      if (!user) throw new Error('Cannot write dashboard items while signed out')
      const profileRef = doc(db, 'profiles', user.uid)
      const key = dashboardItemKey(type, id)
      if (variables.kind === 'add') {
        const { type: t, id: i, addedAt, position } = variables.payload
        const value: ItemPayload =
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
      useDashboardStore.getState().decrementPendingWrites()
    },
    onError: (err, variables) => {
      if (variables.kind === 'add') {
        useDashboardStore.getState().removeOptimistic(type, id)
      } else {
        useDashboardStore.getState().addOptimistic(type, id)
      }
      console.error('Failed to write dashboard item:', err)
    },
  })

  function toggle() {
    if (!user) return
    if (isOnDashboard) {
      useDashboardStore.getState().removeOptimistic(type, id)
      useDashboardStore.getState().incrementPendingWrites()
      mutation.mutate({ kind: 'remove' })
    } else {
      const item: DashboardItem = useDashboardStore.getState().addOptimistic(type, id)
      const payload: ItemPayload = { type, id, addedAt: item.addedAt }
      if (typeof item.position === 'number') payload.position = item.position
      useDashboardStore.getState().incrementPendingWrites()
      mutation.mutate({ kind: 'add', payload })
    }
  }

  return {
    isOnDashboard,
    toggle,
    isToggling: mutation.isPending,
    needsAuth: !user,
  }
}
