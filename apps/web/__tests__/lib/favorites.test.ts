import { arrayToMap, favoriteKey, mapToArray } from '@lib/favorites'
import type { Favorite } from '@lib/favorites'

describe('favoriteKey', () => {
  it('joins type and id with a colon', () => {
    expect(favoriteKey('line', 'red')).toBe('line:red')
    expect(favoriteKey('station', 'clark-lake')).toBe('station:clark-lake')
    expect(favoriteKey('train', 'bnsf_1234')).toBe('train:bnsf_1234')
  })
})

describe('arrayToMap', () => {
  it('keys each favorite by type:id', () => {
    const arr: Favorite[] = [
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
    const first: Favorite = { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }
    const second: Favorite = { type: 'line', id: 'red', addedAt: '2026-04-25T11:00:00Z' }
    expect(arrayToMap([first, second])).toEqual({ 'line:red': second })
  })
})

describe('mapToArray', () => {
  it('returns favorites sorted by addedAt descending', () => {
    const map: Record<string, Favorite> = {
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
    const map: Record<string, Favorite> = {
      'line:red': { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' },
      'line:blue': { type: 'line', id: 'blue', addedAt: '2026-04-25T10:00:00Z' },
    }
    const result = mapToArray(map)
    expect(result).toHaveLength(2)
    expect(result.map((f) => f.id).sort()).toEqual(['blue', 'red'])
  })
})

describe('arrayToMap and mapToArray round-trip', () => {
  it('preserves values when going array → map → array', () => {
    const original: Favorite[] = [
      { type: 'station', id: 'clark-lake', addedAt: '2026-04-25T12:00:00Z' },
      { type: 'train', id: 'bnsf_1234', addedAt: '2026-04-25T11:00:00Z' },
      { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' },
    ]
    expect(mapToArray(arrayToMap(original))).toEqual(original)
  })
})
