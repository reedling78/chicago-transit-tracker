import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Favorite } from '@ctt/shared'
import { REORDER_POSITION_STEP, useFavoritesStore } from '../../../lib/store/favorites'

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
  useFavoritesStore.setState({ favorites: [], hydrated: false, pendingWrites: 0 })
})

describe('useFavoritesStore (mobile)', () => {
  it('starts empty and not hydrated', () => {
    const state = useFavoritesStore.getState()
    expect(state.favorites).toEqual([])
    expect(state.hydrated).toBe(false)
  })

  it('hydrate replaces favorites and flips the hydrated flag', () => {
    const favs: Favorite[] = [{ type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }]
    useFavoritesStore.getState().hydrate(favs)
    const state = useFavoritesStore.getState()
    expect(state.favorites).toEqual(favs)
    expect(state.hydrated).toBe(true)
  })

  it('addOptimistic prepends a new favorite and returns it', () => {
    useFavoritesStore
      .getState()
      .hydrate([{ type: 'line', id: 'red', addedAt: '2026-04-24T10:00:00Z' }])
    const added = useFavoritesStore.getState().addOptimistic('station', 'clark-lake')
    const state = useFavoritesStore.getState()
    expect(state.favorites[0]).toEqual(added)
    expect(state.favorites).toHaveLength(2)
  })

  it('addOptimistic deduplicates by type+id', () => {
    useFavoritesStore
      .getState()
      .hydrate([{ type: 'line', id: 'red', addedAt: '2026-04-24T10:00:00Z' }])
    useFavoritesStore.getState().addOptimistic('line', 'red')
    expect(useFavoritesStore.getState().favorites).toHaveLength(1)
  })

  it('removeOptimistic drops only the matching entry', () => {
    useFavoritesStore.getState().hydrate([
      { type: 'line', id: 'red', addedAt: '2026-04-24T10:00:00Z' },
      { type: 'station', id: 'clark-lake', addedAt: '2026-04-24T11:00:00Z' },
    ])
    useFavoritesStore.getState().removeOptimistic('line', 'red')
    expect(useFavoritesStore.getState().favorites.map((f) => f.id)).toEqual(['clark-lake'])
  })

  it('has() matches on type+id together', () => {
    useFavoritesStore
      .getState()
      .hydrate([{ type: 'line', id: 'red', addedAt: '2026-04-24T10:00:00Z' }])
    const { has } = useFavoritesStore.getState()
    expect(has('line', 'red')).toBe(true)
    expect(has('line', 'blue')).toBe(false)
    expect(has('station', 'red')).toBe(false)
  })

  it('clear() resets to empty + not hydrated and zeroes pendingWrites', () => {
    useFavoritesStore
      .getState()
      .hydrate([{ type: 'line', id: 'red', addedAt: '2026-04-24T10:00:00Z' }])
    useFavoritesStore.getState().incrementPendingWrites()
    useFavoritesStore.getState().clear()
    const state = useFavoritesStore.getState()
    expect(state.favorites).toEqual([])
    expect(state.hydrated).toBe(false)
    expect(state.pendingWrites).toBe(0)
  })

  describe('addOptimistic position assignment', () => {
    it('omits position for the very first favorite', () => {
      const fav = useFavoritesStore.getState().addOptimistic('line', 'red')
      expect(fav.position).toBeUndefined()
    })

    it('omits position when the existing list is partially un-positioned', () => {
      useFavoritesStore.getState().hydrate([
        { type: 'line', id: 'red', addedAt: '2026-04-24T10:00:00Z', position: 1000 },
        { type: 'line', id: 'blue', addedAt: '2026-04-24T11:00:00Z' },
      ])
      const fav = useFavoritesStore.getState().addOptimistic('station', 'clark-lake')
      expect(fav.position).toBeUndefined()
    })

    it('places new favorite above all positioned items when fully reordered', () => {
      useFavoritesStore.getState().hydrate([
        { type: 'line', id: 'red', addedAt: '2026-04-24T10:00:00Z', position: 1000 },
        { type: 'line', id: 'blue', addedAt: '2026-04-24T11:00:00Z', position: 2000 },
      ])
      const fav = useFavoritesStore.getState().addOptimistic('station', 'clark-lake')
      expect(fav.position).toBe(1000 - REORDER_POSITION_STEP)
    })
  })

  describe('reorder', () => {
    it('rewrites positions to dense sparse values in the new order', () => {
      useFavoritesStore.getState().hydrate([
        { type: 'line', id: 'red', addedAt: '2026-04-24T10:00:00Z' },
        { type: 'line', id: 'blue', addedAt: '2026-04-24T11:00:00Z' },
        { type: 'station', id: 'clark-lake', addedAt: '2026-04-24T12:00:00Z' },
      ])
      const newOrder: Favorite[] = [
        { type: 'station', id: 'clark-lake', addedAt: '2026-04-24T12:00:00Z' },
        { type: 'line', id: 'red', addedAt: '2026-04-24T10:00:00Z' },
        { type: 'line', id: 'blue', addedAt: '2026-04-24T11:00:00Z' },
      ]
      useFavoritesStore.getState().reorder(newOrder)
      expect(useFavoritesStore.getState().favorites).toEqual([
        { type: 'station', id: 'clark-lake', addedAt: '2026-04-24T12:00:00Z', position: 1000 },
        { type: 'line', id: 'red', addedAt: '2026-04-24T10:00:00Z', position: 2000 },
        { type: 'line', id: 'blue', addedAt: '2026-04-24T11:00:00Z', position: 3000 },
      ])
    })
  })

  describe('pending writes counter', () => {
    it('increments and decrements', () => {
      useFavoritesStore.getState().incrementPendingWrites()
      useFavoritesStore.getState().incrementPendingWrites()
      expect(useFavoritesStore.getState().pendingWrites).toBe(2)
      useFavoritesStore.getState().decrementPendingWrites()
      expect(useFavoritesStore.getState().pendingWrites).toBe(1)
    })

    it('does not go below zero', () => {
      useFavoritesStore.getState().decrementPendingWrites()
      expect(useFavoritesStore.getState().pendingWrites).toBe(0)
    })
  })
})
