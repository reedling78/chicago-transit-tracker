import { useMutation } from '@tanstack/react-query'
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import { useAuth } from './AuthContext'
import { REORDER_POSITION_STEP, useDashboardStore } from './store/dashboard'
import { dashboardItemKey, type DashboardItem } from '@ctt/shared'
import { trackEvent } from './analytics'

interface UseReorderDashboardItemsResult {
  reorder: (newOrder: DashboardItem[]) => void
  isReordering: boolean
}

export function useReorderDashboardItems(): UseReorderDashboardItemsResult {
  const { user } = useAuth()

  const mutation = useMutation({
    mutationFn: async (newOrder: DashboardItem[]) => {
      if (!user) throw new Error('Cannot reorder dashboard items while signed out')
      const profileRef = doc(db, 'profiles', user.uid)
      const updates: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      }
      newOrder.forEach((item, index) => {
        const key = dashboardItemKey(item.type, item.id)
        updates[`favorites.${key}.position`] = (index + 1) * REORDER_POSITION_STEP
      })
      await updateDoc(profileRef, updates)
    },
    onSettled: () => {
      useDashboardStore.getState().decrementPendingWrites()
    },
    onError: (err) => {
      console.error('Failed to reorder dashboard items:', err)
    },
  })

  function reorder(newOrder: DashboardItem[]) {
    if (!user) return
    useDashboardStore.getState().reorder(newOrder)
    useDashboardStore.getState().incrementPendingWrites()
    mutation.mutate(newOrder)
    void trackEvent('dashboard_items_reordered', { count: newOrder.length })
  }

  return {
    reorder,
    isReordering: mutation.isPending,
  }
}
