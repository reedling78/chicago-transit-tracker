import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const mockUpdateDoc = jest.fn()
const mockServerTimestamp = jest.fn(() => 'SERVER_TS')
const mockDocRef = { id: 'profile-ref' }
const mockDoc = jest.fn(() => mockDocRef)

jest.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
}))

jest.mock('../../app/lib/firebase-client', () => ({ db: { __mock: 'db' } }))

const mockUseAuth = jest.fn()
jest.mock('../../app/components/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}))

import { useClearAllFavorites } from '../../app/lib/hooks/useClearAllFavorites'
import { useFavoritesStore } from '../../app/lib/store/favorites'

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  jest.clearAllMocks()
  useFavoritesStore.setState({ favorites: [], hydrated: false, pendingWrites: 0 })
})

describe('useClearAllFavorites', () => {
  it('is a no-op when there are no favorites', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    const { result } = renderHook(() => useClearAllFavorites(), { wrapper })
    act(() => result.current.clearAll())
    expect(mockUpdateDoc).not.toHaveBeenCalled()
  })

  it('clears the local store and writes favorites: {} to Firestore', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    useFavoritesStore.setState({
      favorites: [
        { type: 'line', id: 'red', addedAt: '2026-01-01T00:00:00Z' },
        { type: 'station', id: 'clark-lake', addedAt: '2026-01-02T00:00:00Z' },
      ],
    })
    mockUpdateDoc.mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useClearAllFavorites(), { wrapper })

    act(() => result.current.clearAll())

    expect(useFavoritesStore.getState().favorites).toEqual([])
    await waitFor(() =>
      expect(mockUpdateDoc).toHaveBeenCalledWith(mockDocRef, {
        favorites: {},
        updatedAt: 'SERVER_TS',
      }),
    )
    await waitFor(() => expect(useFavoritesStore.getState().pendingWrites).toBe(0))
  })

  it('restores the local list when the Firestore write fails', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    const snapshot = [{ type: 'line' as const, id: 'red', addedAt: '2026-01-01T00:00:00Z' }]
    useFavoritesStore.setState({ favorites: snapshot })
    mockUpdateDoc.mockRejectedValueOnce(new Error('boom'))
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(() => useClearAllFavorites(), { wrapper })

    act(() => result.current.clearAll())

    await waitFor(() => expect(useFavoritesStore.getState().favorites).toEqual(snapshot))
    expect(useFavoritesStore.getState().pendingWrites).toBe(0)
    errorSpy.mockRestore()
  })

  it('needsAuth is true when there is no user', () => {
    mockUseAuth.mockReturnValue({ user: null })
    const { result } = renderHook(() => useClearAllFavorites(), { wrapper })
    expect(result.current.needsAuth).toBe(true)
    act(() => result.current.clearAll())
    expect(mockUpdateDoc).not.toHaveBeenCalled()
  })
})
