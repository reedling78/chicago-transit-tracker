import { renderHook, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const mockGetDoc = jest.fn()
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn((_db, coll: string, id: string) => ({ __doc: { coll, id } })),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: jest.fn(),
}))
jest.mock('../../lib/firebase', () => ({ db: {} }))

import { useStationScheduleQuery, useStationTripsQuery } from '../../lib/useDashboardQueries'

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  mockGetDoc.mockReset()
})

describe('useStationScheduleQuery', () => {
  it('returns the document data when present', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ directions: [] }),
    })
    const { result } = renderHook(() => useStationScheduleQuery('clark-lake'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ directions: [] })
  })

  it('returns null when the doc is missing', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false })
    const { result } = renderHook(() => useStationScheduleQuery('missing'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })

  it('is disabled when slug is null', () => {
    const { result } = renderHook(() => useStationScheduleQuery(null), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
    expect(mockGetDoc).not.toHaveBeenCalled()
  })
})

describe('useStationTripsQuery', () => {
  it('returns the document data when present', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ weekday: [], saturday: [], sunday: [] }),
    })
    const { result } = renderHook(() => useStationTripsQuery('aurora'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ weekday: [], saturday: [], sunday: [] })
  })

  it('skips when explicitly disabled', () => {
    const { result } = renderHook(() => useStationTripsQuery('aurora', false), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
    expect(mockGetDoc).not.toHaveBeenCalled()
  })

  it('returns null when the doc is missing', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false })
    const { result } = renderHook(() => useStationTripsQuery('cta-only'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })
})
