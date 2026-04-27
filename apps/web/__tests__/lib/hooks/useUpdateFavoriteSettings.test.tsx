/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { updateDoc } from 'firebase/firestore'
import type { ReactNode } from 'react'

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

import { useUpdateFavoriteSettings } from '@lib/hooks/useUpdateFavoriteSettings'
import { useFavoritesStore } from '@lib/store/favorites'

const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  jest.clearAllMocks()
  useFavoritesStore.setState({ favorites: [], hydrated: false, pendingWrites: 0 })
  localStorage.clear()
})

describe('useUpdateFavoriteSettings', () => {
  it('updates store and Firestore for signed-in users', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'test-uid' } })
    useFavoritesStore
      .getState()
      .hydrate([{ type: 'station', id: 'clark-lake', addedAt: '2026-04-25T10:00:00Z' }])

    const { result } = renderHook(() => useUpdateFavoriteSettings('station', 'clark-lake'), {
      wrapper,
    })
    act(() => result.current.update({ density: 'compact' }))

    expect(useFavoritesStore.getState().favorites[0].density).toBe('compact')
    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalled()
    })
    const args = mockUpdateDoc.mock.calls[0][1] as Record<string, unknown>
    expect(args['favorites.station:clark-lake.density']).toBe('compact')
  })

  it('writes both directionFilter and density when given together', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'test-uid' } })
    useFavoritesStore
      .getState()
      .hydrate([{ type: 'station', id: 'aurora', addedAt: '2026-04-25T10:00:00Z' }])

    const { result } = renderHook(() => useUpdateFavoriteSettings('station', 'aurora'), {
      wrapper,
    })
    act(() => result.current.update({ directionFilter: 'inbound', density: 'expanded' }))

    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalled()
    })
    const args = mockUpdateDoc.mock.calls[0][1] as Record<string, unknown>
    expect(args['favorites.station:aurora.directionFilter']).toBe('inbound')
    expect(args['favorites.station:aurora.density']).toBe('expanded')
  })

  it('writes train origin and destination stop overrides for train favorites', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'test-uid' } })
    useFavoritesStore
      .getState()
      .hydrate([{ type: 'train', id: 'md-w_2222', addedAt: '2026-04-25T10:00:00Z' }])

    const { result } = renderHook(() => useUpdateFavoriteSettings('train', 'md-w_2222'), {
      wrapper,
    })
    act(() =>
      result.current.update({
        trainOriginStopSlug: 'schaumburg',
        trainDestinationStopSlug: 'western-avenue-metra',
      }),
    )

    expect(useFavoritesStore.getState().favorites[0].trainOriginStopSlug).toBe('schaumburg')
    expect(useFavoritesStore.getState().favorites[0].trainDestinationStopSlug).toBe(
      'western-avenue-metra',
    )
    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalled()
    })
    const args = mockUpdateDoc.mock.calls[0][1] as Record<string, unknown>
    expect(args['favorites.train:md-w_2222.trainOriginStopSlug']).toBe('schaumburg')
    expect(args['favorites.train:md-w_2222.trainDestinationStopSlug']).toBe('western-avenue-metra')
  })

  it('updates the store but skips Firestore when signed out', () => {
    mockUseAuth.mockReturnValue({ user: null })
    useFavoritesStore
      .getState()
      .hydrate([{ type: 'station', id: 'clark-lake', addedAt: '2026-04-25T10:00:00Z' }])

    const { result } = renderHook(() => useUpdateFavoriteSettings('station', 'clark-lake'), {
      wrapper,
    })
    act(() => result.current.update({ directionFilter: 'Loop' }))

    expect(useFavoritesStore.getState().favorites[0].directionFilter).toBe('Loop')
    expect(mockUpdateDoc).not.toHaveBeenCalled()
  })

  it('is a no-op when no matching favorite is in the store', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'test-uid' } })
    const { result } = renderHook(() => useUpdateFavoriteSettings('station', 'missing'), {
      wrapper,
    })
    act(() => result.current.update({ density: 'compact' }))
    expect(mockUpdateDoc).not.toHaveBeenCalled()
  })

  it('reverts the optimistic update on Firestore error', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'test-uid' } })
    useFavoritesStore.getState().hydrate([
      {
        type: 'station',
        id: 'clark-lake',
        addedAt: '2026-04-25T10:00:00Z',
        density: 'expanded',
      },
    ])
    mockUpdateDoc.mockRejectedValueOnce(new Error('boom'))
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    const { result } = renderHook(() => useUpdateFavoriteSettings('station', 'clark-lake'), {
      wrapper,
    })
    act(() => result.current.update({ density: 'compact' }))

    expect(useFavoritesStore.getState().favorites[0].density).toBe('compact')
    await waitFor(() => {
      expect(useFavoritesStore.getState().favorites[0].density).toBe('expanded')
    })
    consoleSpy.mockRestore()
  })

  it('manages pendingWrites around the Firestore write', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'test-uid' } })
    useFavoritesStore
      .getState()
      .hydrate([{ type: 'station', id: 'clark-lake', addedAt: '2026-04-25T10:00:00Z' }])

    const { result } = renderHook(() => useUpdateFavoriteSettings('station', 'clark-lake'), {
      wrapper,
    })
    act(() => result.current.update({ density: 'compact' }))

    expect(useFavoritesStore.getState().pendingWrites).toBe(1)
    await waitFor(() => {
      expect(useFavoritesStore.getState().pendingWrites).toBe(0)
    })
  })
})
