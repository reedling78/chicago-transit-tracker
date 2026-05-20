/**
 * @jest-environment jsdom
 */
import { REORDER_POSITION_STEP, useDashboardStore } from '@lib/store/dashboard'
import type { DashboardItem } from '@ctt/shared'

beforeEach(() => {
  localStorage.clear()
  useDashboardStore.setState({ items: [], hydrated: false, pendingWrites: 0 })
})

describe('useDashboardStore', () => {
  it('starts empty and not hydrated', () => {
    const state = useDashboardStore.getState()
    expect(state.items).toEqual([])
    expect(state.hydrated).toBe(false)
  })

  it('hydrate replaces items and flips the hydrated flag', () => {
    const items: DashboardItem[] = [{ type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }]
    useDashboardStore.getState().hydrate(items)
    const state = useDashboardStore.getState()
    expect(state.items).toEqual(items)
    expect(state.hydrated).toBe(true)
  })

  it('addOptimistic prepends a new item and returns it', () => {
    useDashboardStore
      .getState()
      .hydrate([{ type: 'line', id: 'red', addedAt: '2026-04-24T10:00:00Z' }])
    const added = useDashboardStore.getState().addOptimistic('station', 'clark-lake')
    const state = useDashboardStore.getState()
    expect(added.type).toBe('station')
    expect(added.id).toBe('clark-lake')
    expect(typeof added.addedAt).toBe('string')
    expect(state.items[0]).toEqual(added)
    expect(state.items).toHaveLength(2)
  })

  it('addOptimistic deduplicates by type+id (last add wins, refreshed timestamp)', () => {
    useDashboardStore
      .getState()
      .hydrate([{ type: 'line', id: 'red', addedAt: '2026-04-24T10:00:00Z' }])
    const added = useDashboardStore.getState().addOptimistic('line', 'red')
    const state = useDashboardStore.getState()
    expect(state.items).toHaveLength(1)
    expect(state.items[0]).toEqual(added)
    expect(state.items[0].addedAt).not.toBe('2026-04-24T10:00:00Z')
  })

  it('removeOptimistic drops only the matching entry', () => {
    useDashboardStore.getState().hydrate([
      { type: 'line', id: 'red', addedAt: '2026-04-24T10:00:00Z' },
      { type: 'station', id: 'clark-lake', addedAt: '2026-04-24T11:00:00Z' },
    ])
    useDashboardStore.getState().removeOptimistic('line', 'red')
    const state = useDashboardStore.getState()
    expect(state.items.map((i) => i.id)).toEqual(['clark-lake'])
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

  it('clear() resets to empty, not hydrated, and zeroes pendingWrites', () => {
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

  it('persists items to localStorage', () => {
    useDashboardStore.getState().addOptimistic('line', 'red')
    const raw = localStorage.getItem('ctt-dashboard-items')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw as string) as { state: { items: DashboardItem[] } }
    expect(parsed.state.items).toHaveLength(1)
    expect(parsed.state.items[0].id).toBe('red')
  })

  it('does not persist pendingWrites to localStorage', () => {
    useDashboardStore.getState().incrementPendingWrites()
    useDashboardStore.getState().incrementPendingWrites()
    useDashboardStore.getState().addOptimistic('line', 'red')
    const raw = localStorage.getItem('ctt-dashboard-items')
    const parsed = JSON.parse(raw as string) as { state: Record<string, unknown> }
    expect(parsed.state.pendingWrites).toBeUndefined()
  })

  describe('addOptimistic position assignment', () => {
    it('omits position for the very first item', () => {
      const item = useDashboardStore.getState().addOptimistic('line', 'red')
      expect(item.position).toBeUndefined()
    })

    it('omits position when the existing list is partially un-positioned', () => {
      useDashboardStore.getState().hydrate([
        { type: 'line', id: 'red', addedAt: '2026-04-24T10:00:00Z', position: 1000 },
        { type: 'line', id: 'blue', addedAt: '2026-04-24T11:00:00Z' },
      ])
      const item = useDashboardStore.getState().addOptimistic('station', 'clark-lake')
      expect(item.position).toBeUndefined()
    })

    it('places new item above all positioned items when fully reordered', () => {
      useDashboardStore.getState().hydrate([
        { type: 'line', id: 'red', addedAt: '2026-04-24T10:00:00Z', position: 1000 },
        { type: 'line', id: 'blue', addedAt: '2026-04-24T11:00:00Z', position: 2000 },
      ])
      const item = useDashboardStore.getState().addOptimistic('station', 'clark-lake')
      expect(item.position).toBe(1000 - REORDER_POSITION_STEP)
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
    it('merges patch into the matching item', () => {
      useDashboardStore.getState().hydrate([
        { type: 'station', id: 'clark-lake', addedAt: '2026-04-24T10:00:00Z' },
        { type: 'station', id: 'aurora', addedAt: '2026-04-24T11:00:00Z' },
      ])
      useDashboardStore.getState().updateSettings('station', 'clark-lake', {
        directionFilter: 'Loop',
        density: 'compact',
      })
      const state = useDashboardStore.getState()
      expect(state.items[0]).toMatchObject({
        id: 'clark-lake',
        directionFilter: 'Loop',
        density: 'compact',
      })
      expect(state.items[1]).toEqual({
        type: 'station',
        id: 'aurora',
        addedAt: '2026-04-24T11:00:00Z',
      })
    })

    it('is a no-op when no item matches', () => {
      const initial: DashboardItem[] = [
        { type: 'station', id: 'clark-lake', addedAt: '2026-04-24T10:00:00Z' },
      ]
      useDashboardStore.getState().hydrate(initial)
      useDashboardStore.getState().updateSettings('station', 'no-such-id', { density: 'compact' })
      expect(useDashboardStore.getState().items).toEqual(initial)
    })

    it('merges train stop overrides for train items', () => {
      useDashboardStore
        .getState()
        .hydrate([{ type: 'train', id: 'md-w_2222', addedAt: '2026-04-24T10:00:00Z' }])
      useDashboardStore.getState().updateSettings('train', 'md-w_2222', {
        trainOriginStopSlug: 'schaumburg',
        trainDestinationStopSlug: 'western-avenue-metra',
      })
      const item = useDashboardStore.getState().items[0]
      expect(item.trainOriginStopSlug).toBe('schaumburg')
      expect(item.trainDestinationStopSlug).toBe('western-avenue-metra')
    })

    it('partial patches preserve unmentioned fields', () => {
      useDashboardStore.getState().hydrate([
        {
          type: 'station',
          id: 'clark-lake',
          addedAt: '2026-04-24T10:00:00Z',
          directionFilter: 'Loop',
          density: 'expanded',
        },
      ])
      useDashboardStore.getState().updateSettings('station', 'clark-lake', {
        density: 'compact',
      })
      const item = useDashboardStore.getState().items[0]
      expect(item.directionFilter).toBe('Loop')
      expect(item.density).toBe('compact')
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
