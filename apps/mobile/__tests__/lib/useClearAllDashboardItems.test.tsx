import { renderHook, act, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { updateDoc } from 'firebase/firestore'
import type { ReactNode } from 'react'

import { useClearAllDashboardItems } from '../../lib/useClearAllDashboardItems'
import { useDashboardStore } from '../../lib/store/dashboard'

const mockUseAuth = jest.fn()
jest.mock('../../lib/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db, coll: string, id: string) => ({ __doc: { coll, id } })),
  updateDoc: jest.fn(() => Promise.resolve()),
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
  useDashboardStore.setState({ items: [], hydrated: false, pendingWrites: 0 })
})

describe('useClearAllDashboardItems (mobile)', () => {
  it('is a no-op when there are no favorites', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    const { result } = renderHook(() => useClearAllDashboardItems(), { wrapper })
    act(() => result.current.clearAll())
    expect(mockUpdateDoc).not.toHaveBeenCalled()
  })

  it('clears the local store and writes favorites: {} to Firestore', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    useDashboardStore.setState({
      items: [
        { type: 'line', id: 'red', addedAt: '2026-01-01T00:00:00Z' },
        { type: 'station', id: 'clark-lake', addedAt: '2026-01-02T00:00:00Z' },
      ],
    })

    const { result } = renderHook(() => useClearAllDashboardItems(), { wrapper })
    act(() => result.current.clearAll())

    expect(useDashboardStore.getState().items).toEqual([])
    await waitFor(() => expect(mockUpdateDoc).toHaveBeenCalled())
    const args = mockUpdateDoc.mock.calls[0][1] as Record<string, unknown>
    expect(args.favorites).toEqual({})
    await waitFor(() => expect(useDashboardStore.getState().pendingWrites).toBe(0))
  })

  it('restores the local list when the Firestore write fails', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    const snapshot = [{ type: 'line' as const, id: 'red', addedAt: '2026-01-01T00:00:00Z' }]
    useDashboardStore.setState({ items: snapshot })
    mockUpdateDoc.mockRejectedValueOnce(new Error('boom'))
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() => useClearAllDashboardItems(), { wrapper })
    act(() => result.current.clearAll())

    await waitFor(() => expect(useDashboardStore.getState().items).toEqual(snapshot))
    expect(useDashboardStore.getState().pendingWrites).toBe(0)
    errorSpy.mockRestore()
  })

  it('needsAuth is true when there is no user', () => {
    mockUseAuth.mockReturnValue({ user: null })
    const { result } = renderHook(() => useClearAllDashboardItems(), { wrapper })
    expect(result.current.needsAuth).toBe(true)
    act(() => result.current.clearAll())
    expect(mockUpdateDoc).not.toHaveBeenCalled()
  })
})
