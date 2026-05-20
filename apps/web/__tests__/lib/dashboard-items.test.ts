import { arrayToMap, dashboardItemKey, mapToArray } from '@lib/dashboard-items'
import type { DashboardItem } from '@lib/dashboard-items'

describe('dashboardItemKey', () => {
  it('joins type and id with a colon', () => {
    expect(dashboardItemKey('line', 'red')).toBe('line:red')
    expect(dashboardItemKey('station', 'clark-lake')).toBe('station:clark-lake')
    expect(dashboardItemKey('train', 'bnsf_1234')).toBe('train:bnsf_1234')
  })
})

describe('arrayToMap', () => {
  it('keys each item by type:id', () => {
    const arr: DashboardItem[] = [
      { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' },
      { type: 'station', id: 'clark-lake', addedAt: '2026-04-25T11:00:00Z' },
    ]
    expect(arrayToMap(arr)).toEqual({
      'line:red': arr[0],
      'station:clark-lake': arr[1],
    })
  })

  it('returns an empty map for an empty array', () => {
    expect(arrayToMap([])).toEqual({})
  })

  it('overwrites duplicates by key (last one wins)', () => {
    const first: DashboardItem = { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }
    const second: DashboardItem = { type: 'line', id: 'red', addedAt: '2026-04-25T11:00:00Z' }
    expect(arrayToMap([first, second])).toEqual({ 'line:red': second })
  })
})

describe('mapToArray', () => {
  it('returns items sorted by addedAt descending', () => {
    const map: Record<string, DashboardItem> = {
      'line:red': { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' },
      'station:clark-lake': {
        type: 'station',
        id: 'clark-lake',
        addedAt: '2026-04-25T12:00:00Z',
      },
      'train:bnsf_1234': {
        type: 'train',
        id: 'bnsf_1234',
        addedAt: '2026-04-25T11:00:00Z',
      },
    }
    expect(mapToArray(map)).toEqual([
      map['station:clark-lake'],
      map['train:bnsf_1234'],
      map['line:red'],
    ])
  })

  it('returns an empty array for an empty map', () => {
    expect(mapToArray({})).toEqual([])
  })

  it('returns an empty array for null or undefined', () => {
    expect(mapToArray(null)).toEqual([])
    expect(mapToArray(undefined)).toEqual([])
  })

  it('preserves stable ordering for equal timestamps', () => {
    const map: Record<string, DashboardItem> = {
      'line:red': { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' },
      'line:blue': { type: 'line', id: 'blue', addedAt: '2026-04-25T10:00:00Z' },
    }
    const result = mapToArray(map)
    expect(result).toHaveLength(2)
    expect(result.map((i) => i.id).sort()).toEqual(['blue', 'red'])
  })

  it('orders positioned items first (asc) and un-positioned items after (addedAt desc)', () => {
    const map: Record<string, DashboardItem> = {
      'line:red': { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z', position: 2000 },
      'line:blue': { type: 'line', id: 'blue', addedAt: '2026-04-25T11:00:00Z', position: 1000 },
      'station:clark-lake': {
        type: 'station',
        id: 'clark-lake',
        addedAt: '2026-04-25T13:00:00Z',
      },
      'train:bnsf_1234': {
        type: 'train',
        id: 'bnsf_1234',
        addedAt: '2026-04-25T12:00:00Z',
      },
    }
    expect(mapToArray(map).map((i) => i.id)).toEqual(['blue', 'red', 'clark-lake', 'bnsf_1234'])
  })

  it('sorts strictly by position when every item has one', () => {
    const map: Record<string, DashboardItem> = {
      'line:red': { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z', position: 3000 },
      'line:blue': { type: 'line', id: 'blue', addedAt: '2026-04-25T11:00:00Z', position: 1000 },
      'line:brown': {
        type: 'line',
        id: 'brown',
        addedAt: '2026-04-25T12:00:00Z',
        position: 2000,
      },
    }
    expect(mapToArray(map).map((i) => i.id)).toEqual(['blue', 'brown', 'red'])
  })

  it('treats negative positions as higher in the list', () => {
    const map: Record<string, DashboardItem> = {
      'line:red': { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z', position: 1000 },
      'line:blue': { type: 'line', id: 'blue', addedAt: '2026-04-25T11:00:00Z', position: -1000 },
    }
    expect(mapToArray(map).map((i) => i.id)).toEqual(['blue', 'red'])
  })
})

describe('arrayToMap and mapToArray round-trip', () => {
  it('preserves values when going array → map → array', () => {
    const original: DashboardItem[] = [
      { type: 'station', id: 'clark-lake', addedAt: '2026-04-25T12:00:00Z' },
      { type: 'train', id: 'bnsf_1234', addedAt: '2026-04-25T11:00:00Z' },
      { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' },
    ]
    expect(mapToArray(arrayToMap(original))).toEqual(original)
  })
})
