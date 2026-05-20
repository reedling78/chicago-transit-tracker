import { renderHook, act, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { updateDoc } from 'firebase/firestore'
import type { ReactNode } from 'react'

import { useUpdateDashboardItemSettings } from '../../lib/useUpdateDashboardItemSettings'
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

describe('useUpdateDashboardItemSettings (mobile)', () => {
  it('updates store and Firestore for signed-in users', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'test-uid' } })
    useDashboardStore
      .getState()
      .hydrate([{ type: 'station', id: 'aurora', addedAt: '2026-04-25T10:00:00Z' }])

    const { result } = renderHook(() => useUpdateDashboardItemSettings('station', 'aurora'), {
      wrapper,
    })
    act(() => result.current.update({ directionFilter: 'inbound' }))

    expect(useDashboardStore.getState().items[0].directionFilter).toBe('inbound')
    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalled()
    })
    const args = mockUpdateDoc.mock.calls[0][1] as Record<string, unknown>
    expect(args['favorites.station:aurora.directionFilter']).toBe('inbound')
  })

  it('writes train origin and destination stop overrides for train favorites', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'test-uid' } })
    useDashboardStore
      .getState()
      .hydrate([{ type: 'train', id: 'md-w_2222', addedAt: '2026-04-25T10:00:00Z' }])

    const { result } = renderHook(() => useUpdateDashboardItemSettings('train', 'md-w_2222'), {
      wrapper,
    })
    act(() =>
      result.current.update({
        trainOriginStopSlug: 'schaumburg',
        trainDestinationStopSlug: 'western-avenue-metra',
      }),
    )

    expect(useDashboardStore.getState().items[0].trainOriginStopSlug).toBe('schaumburg')
    expect(useDashboardStore.getState().items[0].trainDestinationStopSlug).toBe(
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
    useDashboardStore
      .getState()
      .hydrate([{ type: 'station', id: 'aurora', addedAt: '2026-04-25T10:00:00Z' }])

    const { result } = renderHook(() => useUpdateDashboardItemSettings('station', 'aurora'), {
      wrapper,
    })
    act(() => result.current.update({ density: 'compact' }))

    expect(useDashboardStore.getState().items[0].density).toBe('compact')
    expect(mockUpdateDoc).not.toHaveBeenCalled()
  })

  it('reverts on Firestore error', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'test-uid' } })
    useDashboardStore.getState().hydrate([
      {
        type: 'station',
        id: 'aurora',
        addedAt: '2026-04-25T10:00:00Z',
        density: 'expanded',
      },
    ])
    mockUpdateDoc.mockRejectedValueOnce(new Error('boom'))
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    const { result } = renderHook(() => useUpdateDashboardItemSettings('station', 'aurora'), {
      wrapper,
    })
    act(() => result.current.update({ density: 'compact' }))
    expect(useDashboardStore.getState().items[0].density).toBe('compact')

    await waitFor(() => {
      expect(useDashboardStore.getState().items[0].density).toBe('expanded')
    })
    consoleSpy.mockRestore()
  })

  it('is a no-op when no matching favorite is in the store', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'test-uid' } })
    const { result } = renderHook(() => useUpdateDashboardItemSettings('station', 'missing'), {
      wrapper,
    })
    act(() => result.current.update({ density: 'compact' }))
    expect(mockUpdateDoc).not.toHaveBeenCalled()
  })
})
