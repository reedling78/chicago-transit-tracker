import { useMutation } from '@tanstack/react-query'
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import { useAuth } from './AuthContext'
import { useDashboardStore } from './store/dashboard'
import type { DashboardItem } from '@ctt/shared'

interface UseClearAllDashboardItemsResult {
  clearAll: () => void
  isClearing: boolean
  needsAuth: boolean
}

export function useClearAllDashboardItems(): UseClearAllDashboardItemsResult {
  const { user } = useAuth()

  const mutation = useMutation({
    mutationFn: async (snapshot: DashboardItem[]) => {
      if (!user) throw new Error('Cannot clear dashboard items while signed out')
      void snapshot
      const profileRef = doc(db, 'profiles', user.uid)
      await updateDoc(profileRef, {
        favorites: {},
        updatedAt: serverTimestamp(),
      })
    },
    onSettled: () => {
      useDashboardStore.getState().decrementPendingWrites()
    },
    onError: (err, snapshot) => {
      useDashboardStore.getState().hydrate(snapshot)
      console.error('Failed to clear dashboard items:', err)
    },
  })

  function clearAll() {
    if (!user) return
    const snapshot = useDashboardStore.getState().items
    if (snapshot.length === 0) return
    useDashboardStore.setState({ items: [] })
    useDashboardStore.getState().incrementPendingWrites()
    mutation.mutate(snapshot)
  }

  return {
    clearAll,
    isClearing: mutation.isPending,
    needsAuth: !user,
  }
}
