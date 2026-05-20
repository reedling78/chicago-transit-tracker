import AsyncStorage from '@react-native-async-storage/async-storage'
import type { DashboardItem } from '@ctt/shared'
import { REORDER_POSITION_STEP, useDashboardStore } from '../../../lib/store/dashboard'

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>()
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k: string) => store.get(k) ?? null),
      setItem: jest.fn(async (k: string, v: string) => {
        store.set(k, v)
      }),
      removeItem: jest.fn(async (k: string) => {
        store.delete(k)
      }),
      clear: jest.fn(async () => store.clear()),
      getAllKeys: jest.fn(async () => Array.from(store.keys())),
    },
  }
})

beforeEach(async () => {
  await AsyncStorage.clear()
  useDashboardStore.setState({ items: [], hydrated: false, pendingWrites: 0 })
})

describe('useDashboardStore (mobile)', () => {
  it('starts empty and not hydrated', () => {
    const state = useDashboardStore.getState()
    expect(state.items).toEqual([])
    expect(state.hydrated).toBe(false)
  })

  it('hydrate replaces favorites and flips the hydrated flag', () => {
    const favs: DashboardItem[] = [{ type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }]
    useDashboardStore.getState().hydrate(favs)
    const state = useDashboardStore.getState()
    expect(state.items).toEqual(favs)
    expect(state.hydrated).toBe(true)
  })

  it('addOptimistic prepends a new favorite and returns it', () => {
    useDashboardStore
      .getState()
      .hydrate([{ type: 'line', id: 'red', addedAt: '2026-04-24T10:00:00Z' }])
    const added = useDashboardStore.getState().addOptimistic('station', 'clark-lake')
    const state = useDashboardStore.getState()
    expect(state.items[0]).toEqual(added)
    expect(state.items).toHaveLength(2)
  })

  it('addOptimistic deduplicates by type+id', () => {
    useDashboardStore
      .getState()
      .hydrate([{ type: 'line', id: 'red', addedAt: '2026-04-24T10:00:00Z' }])
    useDashboardStore.getState().addOptimistic('line', 'red')
    expect(useDashboardStore.getState().items).toHaveLength(1)
  })

  it('removeOptimistic drops only the matching entry', () => {
    useDashboardStore.getState().hydrate([
      { type: 'line', id: 'red', addedAt: '2026-04-24T10:00:00Z' },
      { type: 'station', id: 'clark-lake', addedAt: '2026-04-24T11:00:00Z' },
    ])
    useDashboardStore.getState().removeOptimistic('line', 'red')
    expect(useDashboardStore.getState().items.map((f) => f.id)).toEqual(['clark-lake'])
  })

  it('has() matches on type+id together', () => {
    useDashboardStore
      .getState()
      .hydrate([{ type: 'line', id: 'red', addedAt: '2026-04-24T10:00:00Z' }])
    const { has } = useDashboardStore.getState()
    expect(has('line', 'red')).toBe(true)
    expect(has('line', 'blue')).toBe(false)
    expect(has('station', 'red')).toBe(false)
  })

  it('clear() resets to empty + not hydrated and zeroes pendingWrites', () => {
    useDashboardStore
      .getState()
      .hydrate([{ type: 'line', id: 'red', addedAt: '2026-04-24T10:00:00Z' }])
    useDashboardStore.getState().incrementPendingWrites()
    useDashboardStore.getState().clear()
    const state = useDashboardStore.getState()
    expect(state.items).toEqual([])
    expect(state.hydrated).toBe(false)
    expect(state.pendingWrites).toBe(0)
  })

  describe('addOptimistic position assignment', () => {
    it('omits position for the very first favorite', () => {
      const fav = useDashboardStore.getState().addOptimistic('line', 'red')
      expect(fav.position).toBeUndefined()
    })

    it('omits position when the existing list is partially un-positioned', () => {
      useDashboardStore.getState().hydrate([
        { type: 'line', id: 'red', addedAt: '2026-04-24T10:00:00Z', position: 1000 },
        { type: 'line', id: 'blue', addedAt: '2026-04-24T11:00:00Z' },
      ])
      const fav = useDashboardStore.getState().addOptimistic('station', 'clark-lake')
      expect(fav.position).toBeUndefined()
    })

    it('places new favorite above all positioned items when fully reordered', () => {
      useDashboardStore.getState().hydrate([
        { type: 'line', id: 'red', addedAt: '2026-04-24T10:00:00Z', position: 1000 },
        { type: 'line', id: 'blue', addedAt: '2026-04-24T11:00:00Z', position: 2000 },
      ])
      const fav = useDashboardStore.getState().addOptimistic('station', 'clark-lake')
      expect(fav.position).toBe(1000 - REORDER_POSITION_STEP)
    })
  })

  describe('reorder', () => {
    it('rewrites positions to dense sparse values in the new order', () => {
      useDashboardStore.getState().hydrate([
        { type: 'line', id: 'red', addedAt: '2026-04-24T10:00:00Z' },
        { type: 'line', id: 'blue', addedAt: '2026-04-24T11:00:00Z' },
        { type: 'station', id: 'clark-lake', addedAt: '2026-04-24T12:00:00Z' },
      ])
      const newOrder: DashboardItem[] = [
        { type: 'station', id: 'clark-lake', addedAt: '2026-04-24T12:00:00Z' },
        { type: 'line', id: 'red', addedAt: '2026-04-24T10:00:00Z' },
        { type: 'line', id: 'blue', addedAt: '2026-04-24T11:00:00Z' },
      ]
      useDashboardStore.getState().reorder(newOrder)
      expect(useDashboardStore.getState().items).toEqual([
        { type: 'station', id: 'clark-lake', addedAt: '2026-04-24T12:00:00Z', position: 1000 },
        { type: 'line', id: 'red', addedAt: '2026-04-24T10:00:00Z', position: 2000 },
        { type: 'line', id: 'blue', addedAt: '2026-04-24T11:00:00Z', position: 3000 },
      ])
    })
  })

  describe('updateSettings', () => {
    it('merges patch into the matching favorite', () => {
      useDashboardStore.getState().hydrate([
        { type: 'station', id: 'clark-lake', addedAt: '2026-04-24T10:00:00Z' },
        { type: 'station', id: 'aurora', addedAt: '2026-04-24T11:00:00Z' },
      ])
      useDashboardStore.getState().updateSettings('station', 'clark-lake', {
        directionFilter: 'inbound',
        density: 'compact',
      })
      const state = useDashboardStore.getState()
      expect(state.items[0]).toMatchObject({
        id: 'clark-lake',
        directionFilter: 'inbound',
        density: 'compact',
      })
      expect(state.items[1]).toEqual({
        type: 'station',
        id: 'aurora',
        addedAt: '2026-04-24T11:00:00Z',
      })
    })

    it('is a no-op when no favorite matches', () => {
      const initial: DashboardItem[] = [
        { type: 'station', id: 'clark-lake', addedAt: '2026-04-24T10:00:00Z' },
      ]
      useDashboardStore.getState().hydrate(initial)
      useDashboardStore.getState().updateSettings('station', 'no-such-id', { density: 'compact' })
      expect(useDashboardStore.getState().items).toEqual(initial)
    })

    it('merges train stop overrides for train favorites', () => {
      useDashboardStore
        .getState()
        .hydrate([{ type: 'train', id: 'md-w_2222', addedAt: '2026-04-24T10:00:00Z' }])
      useDashboardStore.getState().updateSettings('train', 'md-w_2222', {
        trainOriginStopSlug: 'schaumburg',
        trainDestinationStopSlug: 'western-avenue-metra',
      })
      const fav = useDashboardStore.getState().items[0]
      expect(fav.trainOriginStopSlug).toBe('schaumburg')
      expect(fav.trainDestinationStopSlug).toBe('western-avenue-metra')
    })

    it('partial patches preserve unmentioned fields', () => {
      useDashboardStore.getState().hydrate([
        {
          type: 'station',
          id: 'clark-lake',
          addedAt: '2026-04-24T10:00:00Z',
          directionFilter: 'inbound',
          density: 'expanded',
        },
      ])
      useDashboardStore.getState().updateSettings('station', 'clark-lake', {
        density: 'compact',
      })
      const fav = useDashboardStore.getState().items[0]
      expect(fav.directionFilter).toBe('inbound')
      expect(fav.density).toBe('compact')
    })
  })

  describe('pending writes counter', () => {
    it('increments and decrements', () => {
      useDashboardStore.getState().incrementPendingWrites()
      useDashboardStore.getState().incrementPendingWrites()
      expect(useDashboardStore.getState().pendingWrites).toBe(2)
      useDashboardStore.getState().decrementPendingWrites()
      expect(useDashboardStore.getState().pendingWrites).toBe(1)
    })

    it('does not go below zero', () => {
      useDashboardStore.getState().decrementPendingWrites()
      expect(useDashboardStore.getState().pendingWrites).toBe(0)
    })
  })
})
