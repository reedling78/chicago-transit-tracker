import { renderHook, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import {
  useFavoriteTripQuery,
  useLinesQuery,
  useStationScheduleQuery,
  useStationTripsQuery,
} from '../../lib/useDashboardQueries'

const mockGetDoc = jest.fn()
const mockGetDocs = jest.fn()
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn((_db, coll: string, id: string) => ({ __doc: { coll, id } })),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}))
jest.mock('../../lib/firebase', () => ({ db: {} }))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  mockGetDoc.mockReset()
  mockGetDocs.mockReset()
})

describe('display-name normalization', () => {
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
    })
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
    })
    const { result } = renderHook(() => useFavoriteTripQuery('bnsf_1200'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.headsign).toBe('Union Station')
    expect(result.current.data?.stops[0].stationName).toBe('Union Station')
    expect(result.current.data?.stops[0].slug).toBe('union-station')
  })

  it('useStationScheduleQuery normalizes direction headsigns', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        directions: [{ headsign: 'Chicago OTC', weekday: [], saturday: [], sunday: [] }],
      }),
    })
    const { result } = renderHook(() => useStationScheduleQuery('lombard'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.directions[0].headsign).toBe('Ogilvie TC')
  })

  it('useStationTripsQuery normalizes headsigns across service types', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        weekday: [{ tripId: 't1', departure: '6:00 AM', headsign: 'Chicago OTC' }],
        saturday: [],
        sunday: [],
      }),
    })
    const { result } = renderHook(() => useStationTripsQuery('lombard'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.weekday[0].headsign).toBe('Ogilvie TC')
  })
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
