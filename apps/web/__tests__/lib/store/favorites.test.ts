/**
 * @jest-environment jsdom
 */
import { REORDER_POSITION_STEP, useFavoritesStore } from '@lib/store/favorites'
import type { Favorite } from '@ctt/shared'

beforeEach(() => {
  localStorage.clear()
  useFavoritesStore.setState({ favorites: [], hydrated: false, pendingWrites: 0 })
})

describe('useFavoritesStore', () => {
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
    expect(added.type).toBe('station')
    expect(added.id).toBe('clark-lake')
    expect(typeof added.addedAt).toBe('string')
    expect(state.favorites[0]).toEqual(added)
    expect(state.favorites).toHaveLength(2)
  })

  it('addOptimistic deduplicates by type+id (last add wins, refreshed timestamp)', () => {
    useFavoritesStore
      .getState()
      .hydrate([{ type: 'line', id: 'red', addedAt: '2026-04-24T10:00:00Z' }])
    const added = useFavoritesStore.getState().addOptimistic('line', 'red')
    const state = useFavoritesStore.getState()
    expect(state.favorites).toHaveLength(1)
    expect(state.favorites[0]).toEqual(added)
    expect(state.favorites[0].addedAt).not.toBe('2026-04-24T10:00:00Z')
  })

  it('removeOptimistic drops only the matching entry', () => {
    useFavoritesStore.getState().hydrate([
      { type: 'line', id: 'red', addedAt: '2026-04-24T10:00:00Z' },
      { type: 'station', id: 'clark-lake', addedAt: '2026-04-24T11:00:00Z' },
    ])
    useFavoritesStore.getState().removeOptimistic('line', 'red')
    const state = useFavoritesStore.getState()
    expect(state.favorites.map((f) => f.id)).toEqual(['clark-lake'])
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

  it('clear() resets to empty, not hydrated, and zeroes pendingWrites', () => {
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

  it('persists favorites to localStorage', () => {
    useFavoritesStore.getState().addOptimistic('line', 'red')
    const raw = localStorage.getItem('ctt-favorites')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw as string) as { state: { favorites: Favorite[] } }
    expect(parsed.state.favorites).toHaveLength(1)
    expect(parsed.state.favorites[0].id).toBe('red')
  })

  it('does not persist pendingWrites to localStorage', () => {
    useFavoritesStore.getState().incrementPendingWrites()
    useFavoritesStore.getState().incrementPendingWrites()
    useFavoritesStore.getState().addOptimistic('line', 'red')
    const raw = localStorage.getItem('ctt-favorites')
    const parsed = JSON.parse(raw as string) as { state: Record<string, unknown> }
    expect(parsed.state.pendingWrites).toBeUndefined()
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

  describe('updateSettings', () => {
    it('merges patch into the matching favorite', () => {
      useFavoritesStore.getState().hydrate([
        { type: 'station', id: 'clark-lake', addedAt: '2026-04-24T10:00:00Z' },
        { type: 'station', id: 'aurora', addedAt: '2026-04-24T11:00:00Z' },
      ])
      useFavoritesStore.getState().updateSettings('station', 'clark-lake', {
        directionFilter: 'Loop',
        density: 'compact',
      })
      const state = useFavoritesStore.getState()
      expect(state.favorites[0]).toMatchObject({
        id: 'clark-lake',
        directionFilter: 'Loop',
        density: 'compact',
      })
      // Other favorite untouched.
      expect(state.favorites[1]).toEqual({
        type: 'station',
        id: 'aurora',
        addedAt: '2026-04-24T11:00:00Z',
      })
    })

    it('is a no-op when no favorite matches', () => {
      const initial: Favorite[] = [
        { type: 'station', id: 'clark-lake', addedAt: '2026-04-24T10:00:00Z' },
      ]
      useFavoritesStore.getState().hydrate(initial)
      useFavoritesStore.getState().updateSettings('station', 'no-such-id', { density: 'compact' })
      expect(useFavoritesStore.getState().favorites).toEqual(initial)
    })

    it('merges train stop overrides for train favorites', () => {
      useFavoritesStore
        .getState()
        .hydrate([{ type: 'train', id: 'md-w_2222', addedAt: '2026-04-24T10:00:00Z' }])
      useFavoritesStore.getState().updateSettings('train', 'md-w_2222', {
        trainOriginStopSlug: 'schaumburg',
        trainDestinationStopSlug: 'western-avenue-metra',
      })
      const fav = useFavoritesStore.getState().favorites[0]
      expect(fav.trainOriginStopSlug).toBe('schaumburg')
      expect(fav.trainDestinationStopSlug).toBe('western-avenue-metra')
    })

    it('partial patches preserve unmentioned fields', () => {
      useFavoritesStore.getState().hydrate([
        {
          type: 'station',
          id: 'clark-lake',
          addedAt: '2026-04-24T10:00:00Z',
          directionFilter: 'Loop',
          density: 'expanded',
        },
      ])
      useFavoritesStore.getState().updateSettings('station', 'clark-lake', {
        density: 'compact',
      })
      const fav = useFavoritesStore.getState().favorites[0]
      expect(fav.directionFilter).toBe('Loop')
      expect(fav.density).toBe('compact')
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
