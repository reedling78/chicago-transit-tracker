import { renderHook, act, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { updateDoc, deleteField } from 'firebase/firestore'
import type { ReactNode } from 'react'

import { useToggleFavorite } from '../../lib/useToggleFavorite'
import { useFavoritesStore } from '../../lib/store/favorites'

const mockUseAuth = jest.fn()
jest.mock('../../lib/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db, coll: string, id: string) => ({ __doc: { coll, id } })),
  updateDoc: jest.fn(() => Promise.resolve()),
  deleteField: jest.fn(() => '__deleteField__'),
  serverTimestamp: jest.fn(() => '__serverTimestamp__'),
  getFirestore: jest.fn(),
}))

jest.mock('../../lib/firebase', () => ({ db: {} }))

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

const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  jest.clearAllMocks()
  useFavoritesStore.setState({ favorites: [], hydrated: false, pendingWrites: 0 })
})

describe('useToggleFavorite (mobile)', () => {
  it('reports needsAuth=true when signed out', () => {
    mockUseAuth.mockReturnValue({ user: null })
    const { result } = renderHook(() => useToggleFavorite('line', 'red'), { wrapper })
    expect(result.current.needsAuth).toBe(true)
  })

  it('toggle is a no-op when signed out', () => {
    mockUseAuth.mockReturnValue({ user: null })
    const { result } = renderHook(() => useToggleFavorite('line', 'red'), { wrapper })
    act(() => result.current.toggle())
    expect(mockUpdateDoc).not.toHaveBeenCalled()
  })

  it('toggle adds optimistically and writes map-keyed value to Firestore', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'test-uid' } })
    const { result } = renderHook(() => useToggleFavorite('station', 'clark-lake'), { wrapper })

    act(() => result.current.toggle())

    expect(useFavoritesStore.getState().has('station', 'clark-lake')).toBe(true)
    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalled()
    })
    const args = mockUpdateDoc.mock.calls[0][1] as Record<string, unknown>
    expect(args['favorites.station:clark-lake']).toMatchObject({
      type: 'station',
      id: 'clark-lake',
    })
  })

  it('toggle removes when already favorited and deleteField is sent', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'test-uid' } })
    useFavoritesStore
      .getState()
      .hydrate([{ type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }])

    const { result } = renderHook(() => useToggleFavorite('line', 'red'), { wrapper })
    expect(result.current.isFavorited).toBe(true)

    act(() => result.current.toggle())

    expect(useFavoritesStore.getState().has('line', 'red')).toBe(false)
    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalled()
    })
    const args = mockUpdateDoc.mock.calls[0][1] as Record<string, unknown>
    expect(args['favorites.line:red']).toBe('__deleteField__')
    expect(deleteField).toHaveBeenCalled()
  })

  it('rolls back the optimistic add on Firestore error', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'test-uid' } })
    mockUpdateDoc.mockRejectedValueOnce(new Error('boom'))
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    const { result } = renderHook(() => useToggleFavorite('train', 'bnsf_1234'), { wrapper })
    act(() => result.current.toggle())

    expect(useFavoritesStore.getState().has('train', 'bnsf_1234')).toBe(true)
    await waitFor(() => {
      expect(useFavoritesStore.getState().has('train', 'bnsf_1234')).toBe(false)
    })

    consoleSpy.mockRestore()
  })

  it('writes position when adding to a fully-reordered list', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'test-uid' } })
    useFavoritesStore.getState().hydrate([
      { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z', position: 1000 },
      { type: 'line', id: 'blue', addedAt: '2026-04-25T11:00:00Z', position: 2000 },
    ])

    const { result } = renderHook(() => useToggleFavorite('station', 'clark-lake'), { wrapper })
    act(() => result.current.toggle())

    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalled()
    })
    const args = mockUpdateDoc.mock.calls[0][1] as Record<string, unknown>
    expect(args['favorites.station:clark-lake']).toMatchObject({
      type: 'station',
      id: 'clark-lake',
      position: 0,
    })
  })

  it('omits position when adding to a partially-positioned list', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'test-uid' } })
    useFavoritesStore.getState().hydrate([
      { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z', position: 1000 },
      { type: 'line', id: 'blue', addedAt: '2026-04-25T11:00:00Z' },
    ])

    const { result } = renderHook(() => useToggleFavorite('station', 'clark-lake'), { wrapper })
    act(() => result.current.toggle())

    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalled()
    })
    const args = mockUpdateDoc.mock.calls[0][1] as Record<string, unknown>
    const value = args['favorites.station:clark-lake'] as Record<string, unknown>
    expect(value).toMatchObject({ type: 'station', id: 'clark-lake' })
    expect(value.position).toBeUndefined()
  })

  it('increments pendingWrites during a write and decrements after settle', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'test-uid' } })

    const { result } = renderHook(() => useToggleFavorite('line', 'red'), { wrapper })
    act(() => result.current.toggle())

    expect(useFavoritesStore.getState().pendingWrites).toBe(1)
    await waitFor(() => {
      expect(useFavoritesStore.getState().pendingWrites).toBe(0)
    })
  })
})
