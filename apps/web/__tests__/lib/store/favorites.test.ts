/**
 * @jest-environment jsdom
 */
import { useFavoritesStore } from '@lib/store/favorites'
import type { Favorite } from '@ctt/shared'

beforeEach(() => {
  localStorage.clear()
  useFavoritesStore.setState({ favorites: [], hydrated: false })
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

  it('clear() resets to empty + not hydrated', () => {
    useFavoritesStore
      .getState()
      .hydrate([{ type: 'line', id: 'red', addedAt: '2026-04-24T10:00:00Z' }])
    useFavoritesStore.getState().clear()
    const state = useFavoritesStore.getState()
    expect(state.favorites).toEqual([])
    expect(state.hydrated).toBe(false)
  })

  it('persists favorites to localStorage', () => {
    useFavoritesStore.getState().addOptimistic('line', 'red')
    const raw = localStorage.getItem('ctt-favorites')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw as string) as { state: { favorites: Favorite[] } }
    expect(parsed.state.favorites).toHaveLength(1)
    expect(parsed.state.favorites[0].id).toBe('red')
  })
})
