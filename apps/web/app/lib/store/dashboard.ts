'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type {
  DashboardItem,
  DashboardItemType,
  DashboardItemDensity,
  DashboardItemDirection,
} from '@ctt/shared'

/** Subset of DashboardItem fields that can be updated via `updateSettings`. */
export type DashboardItemSettingsPatch = {
  directionFilter?: DashboardItemDirection
  lineFilter?: string
  density?: DashboardItemDensity
  trainOriginStopSlug?: string
  trainDestinationStopSlug?: string
}

/** Reorder positions are written as a dense sequence (1000, 2000, 3000, ...). */
export const REORDER_POSITION_STEP = 1000

interface DashboardState {
  /**
   * Items in their effective sort order (position asc, then addedAt desc for un-positioned).
   * Mirrors what `@ctt/shared`'s `mapToArray` produces from a Firestore snapshot.
   */
  items: DashboardItem[]
  /** True after the first hydrate from a remote profile snapshot. */
  hydrated: boolean
  /**
   * Number of in-flight Firestore writes initiated by the local store.
   * While >0, snapshot handlers should skip `hydrate` to avoid clobbering
   * an unconfirmed optimistic update with stale server data. In-memory only —
   * never persist or a closed tab mid-write would block hydrate on next load.
   */
  pendingWrites: number
  hydrate: (items: DashboardItem[]) => void
  addOptimistic: (type: DashboardItemType, id: string) => DashboardItem
  removeOptimistic: (type: DashboardItemType, id: string) => void
  /**
   * Replace the items list with a new ordering, stamping each item's
   * `position` to its index in the new order (1000, 2000, ...). Used by the
   * drag-to-reorder UI; the same positions are persisted to Firestore.
   */
  reorder: (newOrder: DashboardItem[]) => void
  /**
   * Merge a partial settings patch into the matching item. Used by the
   * dashboard card menu to update `directionFilter` / `density`. No-op if no
   * item with the given type+id exists in the store.
   */
  updateSettings: (type: DashboardItemType, id: string, patch: DashboardItemSettingsPatch) => void
  has: (type: DashboardItemType, id: string) => boolean
  clear: () => void
  incrementPendingWrites: () => void
  decrementPendingWrites: () => void
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      items: [],
      hydrated: false,
      pendingWrites: 0,
      hydrate: (items) => set({ items, hydrated: true }),
      addOptimistic: (type, id) => {
        const item: DashboardItem = computeNewItem(type, id, get().items)
        set((state) => {
          const filtered = state.items.filter((i) => i.type !== type || i.id !== id)
          return { items: [item, ...filtered] }
        })
        return item
      },
      removeOptimistic: (type, id) => {
        set((state) => ({
          items: state.items.filter((i) => i.type !== type || i.id !== id),
        }))
      },
      reorder: (newOrder) => {
        const repositioned = newOrder.map((item, index) => ({
          ...item,
          position: (index + 1) * REORDER_POSITION_STEP,
        }))
        set({ items: repositioned })
      },
      updateSettings: (type, id, patch) => {
        set((state) => ({
          items: state.items.map((i) => (i.type === type && i.id === id ? { ...i, ...patch } : i)),
        }))
      },
      has: (type, id) => get().items.some((i) => i.type === type && i.id === id),
      clear: () => set({ items: [], hydrated: false, pendingWrites: 0 }),
      incrementPendingWrites: () => set((state) => ({ pendingWrites: state.pendingWrites + 1 })),
      decrementPendingWrites: () =>
        set((state) => ({ pendingWrites: Math.max(0, state.pendingWrites - 1) })),
    }),
    {
      name: 'ctt-dashboard-items',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? window.localStorage : ({} as Storage),
      ),
      partialize: (state) => ({ items: state.items }),
    },
  ),
)

/**
 * Build a new DashboardItem for `addOptimistic`. New items land at the top of
 * the list. If every existing item has been positioned (fully reordered user),
 * the new one gets `min(positions) - REORDER_POSITION_STEP` so it slots above
 * them. Otherwise we leave `position` undefined and let `addedAt` (newest-first)
 * place it above the un-positioned items.
 */
function computeNewItem(
  type: DashboardItemType,
  id: string,
  existing: DashboardItem[],
): DashboardItem {
  const item: DashboardItem = { type, id, addedAt: new Date().toISOString() }
  if (existing.length === 0) return item
  const positions = existing
    .map((i) => i.position)
    .filter((p): p is number => typeof p === 'number')
  if (positions.length !== existing.length) return item
  return { ...item, position: Math.min(...positions) - REORDER_POSITION_STEP }
}
