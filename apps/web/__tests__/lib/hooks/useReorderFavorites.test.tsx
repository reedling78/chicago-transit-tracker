/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { updateDoc } from 'firebase/firestore'
import type { ReactNode } from 'react'
import type { Favorite } from '@ctt/shared'

const mockUseAuth = jest.fn()
jest.mock('@components/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db, coll: string, id: string) => ({ __doc: { coll, id } })),
  updateDoc: jest.fn(() => Promise.resolve()),
  serverTimestamp: jest.fn(() => '__serverTimestamp__'),
  getFirestore: jest.fn(),
}))

jest.mock('@lib/firebase-client', () => ({ db: {} }))

import { useReorderFavorites } from '@lib/hooks/useReorderFavorites'
import { useFavoritesStore } from '@lib/store/favorites'

const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const sampleFavorites: Favorite[] = [
  { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' },
  { type: 'station', id: 'clark-lake', addedAt: '2026-04-25T11:00:00Z' },
  { type: 'train', id: 'bnsf_1234', addedAt: '2026-04-25T12:00:00Z' },
]

beforeEach(() => {
  jest.clearAllMocks()
  useFavoritesStore.setState({ favorites: [], hydrated: false, pendingWrites: 0 })
  localStorage.clear()
})

describe('useReorderFavorites', () => {
  it('is a no-op when signed out', () => {
    mockUseAuth.mockReturnValue({ user: null })
    const { result } = renderHook(() => useReorderFavorites(), { wrapper })
    act(() => result.current.reorder(sampleFavorites))
    expect(mockUpdateDoc).not.toHaveBeenCalled()
  })

  it('optimistically reorders the local store with dense positions', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'test-uid' } })
    useFavoritesStore.getState().hydrate(sampleFavorites)

    const { result } = renderHook(() => useReorderFavorites(), { wrapper })
    const newOrder: Favorite[] = [sampleFavorites[2], sampleFavorites[0], sampleFavorites[1]]
    act(() => result.current.reorder(newOrder))

    const stored = useFavoritesStore.getState().favorites
    expect(stored.map((f) => f.id)).toEqual(['bnsf_1234', 'red', 'clark-lake'])
    expect(stored.map((f) => f.position)).toEqual([1000, 2000, 3000])
  })

  it('writes a single updateDoc with one position field per favorite', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'test-uid' } })
    useFavoritesStore.getState().hydrate(sampleFavorites)

    const { result } = renderHook(() => useReorderFavorites(), { wrapper })
    const newOrder: Favorite[] = [sampleFavorites[2], sampleFavorites[0], sampleFavorites[1]]
    act(() => result.current.reorder(newOrder))

    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalled()
    })
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1)
    const args = mockUpdateDoc.mock.calls[0][1] as Record<string, unknown>
    expect(args).toMatchObject({
      'favorites.train:bnsf_1234.position': 1000,
      'favorites.line:red.position': 2000,
      'favorites.station:clark-lake.position': 3000,
      updatedAt: '__serverTimestamp__',
    })
  })

  it('increments pendingWrites during a write and decrements after settle', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'test-uid' } })
    useFavoritesStore.getState().hydrate(sampleFavorites)

    const { result } = renderHook(() => useReorderFavorites(), { wrapper })
    act(() => result.current.reorder(sampleFavorites))

    expect(useFavoritesStore.getState().pendingWrites).toBe(1)
    await waitFor(() => {
      expect(useFavoritesStore.getState().pendingWrites).toBe(0)
    })
  })

  it('logs and decrements pendingWrites on Firestore error', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'test-uid' } })
    useFavoritesStore.getState().hydrate(sampleFavorites)
    mockUpdateDoc.mockRejectedValueOnce(new Error('boom'))
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    const { result } = renderHook(() => useReorderFavorites(), { wrapper })
    act(() => result.current.reorder(sampleFavorites))

    await waitFor(() => {
      expect(useFavoritesStore.getState().pendingWrites).toBe(0)
    })
    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })
})
