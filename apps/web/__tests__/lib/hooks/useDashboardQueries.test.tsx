/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

jest.mock('@lib/firebase-client', () => ({ db: {} }))
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
}))

import { getDoc, getDocs } from 'firebase/firestore'
import {
  useFavoriteTripQuery,
  useLinesQuery,
  useStationScheduleQuery,
  useStationTripsQuery,
} from '@lib/hooks/useDashboardQueries'

const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>

const mockFetch = jest.fn()

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  mockFetch.mockReset()
  mockGetDoc.mockReset()
  mockGetDocs.mockReset()
  global.fetch = mockFetch as unknown as typeof fetch
})

describe('display-name normalization (direct Firestore reads)', () => {
  it('useLinesQuery normalizes termini and downtownTerminal', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        {
          data: () => ({
            slug: 'up-n',
            termini: ['Ogilvie Transportation Center', 'Kenosha'],
            downtownTerminal: 'Ogilvie Transportation Center',
          }),
        },
      ],
    } as never)
    const { result } = renderHook(() => useLinesQuery(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.[0].termini).toEqual(['Ogilvie TC', 'Kenosha'])
    expect(result.current.data?.[0].downtownTerminal).toBe('Ogilvie TC')
  })

  it('useFavoriteTripQuery normalizes headsign and stop station names', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        trainNumber: '1200',
        headsign: 'Chicago Union Station',
        stops: [{ sequence: 1, stationName: 'Chicago Union Station', slug: 'union-station' }],
      }),
    } as never)
    const { result } = renderHook(() => useFavoriteTripQuery('bnsf_1200'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.headsign).toBe('Union Station')
    expect(result.current.data?.stops[0].stationName).toBe('Union Station')
    expect(result.current.data?.stops[0].slug).toBe('union-station')
  })
})

describe('useStationScheduleQuery', () => {
  it('fetches /api/schedules/<slug> and returns the parsed body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ directions: [] }),
    })
    const { result } = renderHook(() => useStationScheduleQuery('clark-lake'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockFetch).toHaveBeenCalledWith('/api/schedules/clark-lake')
    expect(result.current.data).toEqual({ directions: [] })
  })

  it('returns null on 404', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
    const { result } = renderHook(() => useStationScheduleQuery('missing'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })

  it('is disabled when slug is null', () => {
    const { result } = renderHook(() => useStationScheduleQuery(null), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe('useStationTripsQuery', () => {
  it('fetches /api/metra/station-trips/<slug> and returns the body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ weekday: [], saturday: [], sunday: [] }),
    })
    const { result } = renderHook(() => useStationTripsQuery('aurora'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockFetch).toHaveBeenCalledWith('/api/metra/station-trips/aurora')
    expect(result.current.data).toEqual({ weekday: [], saturday: [], sunday: [] })
  })

  it('skips the fetch when explicitly disabled', () => {
    const { result } = renderHook(() => useStationTripsQuery('aurora', false), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns null on 404', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
    const { result } = renderHook(() => useStationTripsQuery('cta-only'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })
})
