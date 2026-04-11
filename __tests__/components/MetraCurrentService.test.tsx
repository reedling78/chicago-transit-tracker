import { act, render, screen, waitFor } from '@testing-library/react'
import MetraCurrentService from '@components/MetraCurrentService'
import { fetchMetraFeed } from '@lib/metra-realtime'
import type { MetraLineTrip } from '@lib/transit'

jest.mock('@lib/metra-realtime')
const mockFetch = fetchMetraFeed as jest.MockedFunction<typeof fetchMetraFeed>

// Pick a fixed "now" so schedule-based selection is deterministic.
const FIXED_NOW = new Date(2100, 0, 4, 7, 0, 0) // Monday 7:00 AM
const FIXED_START_DATE = '21000104'

function epochAt(h: number, m: number): number {
  return Math.floor(new Date(2100, 0, 4, h, m, 0).getTime() / 1000)
}

function trip(
  trainNumber: string,
  headsign: string,
  firstDep: string,
  lastArr: string,
  serviceType: 'weekday' | 'saturday' | 'sunday' = 'weekday',
): MetraLineTrip {
  return {
    trainNumber,
    headsign,
    serviceType,
    directionId: 0,
    stops: [
      {
        sequence: 1,
        stationName: 'Aurora',
        slug: 'aurora',
        arrival: firstDep,
        departure: firstDep,
      },
      {
        sequence: 2,
        stationName: 'Naperville',
        slug: 'naperville',
        arrival: '7:15 AM',
        departure: '7:16 AM',
      },
      {
        sequence: 3,
        stationName: 'Downers Grove',
        slug: 'downers-grove',
        arrival: '7:30 AM',
        departure: '7:31 AM',
      },
      {
        sequence: 4,
        stationName: 'Union Station',
        slug: 'union-station',
        arrival: lastArr,
        departure: lastArr,
      },
    ],
  }
}

function emptyFeed() {
  return { header: {}, entity: [] } as never
}

function tripUpdateFeed(
  entries: Array<{
    trainNumber: string
    stopTimeUpdate: Array<{
      stopSequence: number
      arrivalTime?: number
      scheduleRelationship?: number
    }>
  }>,
) {
  return {
    header: {},
    entity: entries.map((e, idx) => ({
      id: String(idx),
      tripUpdate: {
        trip: {
          tripId: `BNSF_BN${e.trainNumber}_V1_A`,
          routeId: 'BNSF',
          startDate: FIXED_START_DATE,
        },
        stopTimeUpdate: e.stopTimeUpdate.map((s) => ({
          stopSequence: s.stopSequence,
          arrival: s.arrivalTime != null ? { time: s.arrivalTime } : undefined,
          scheduleRelationship: s.scheduleRelationship,
        })),
      },
    })),
  } as never
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers({
    doNotFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'setImmediate',
      'clearImmediate',
      'nextTick',
      'queueMicrotask',
      'performance',
    ],
    now: FIXED_NOW,
  })
})

afterEach(() => {
  jest.useRealTimers()
})

describe('MetraCurrentService', () => {
  const sampleTrips: MetraLineTrip[] = [
    // Already-running: first departure at 6:30 AM, last arrival 7:30 AM
    {
      ...trip('1200', 'Union Station', '6:30 AM', '7:30 AM'),
    },
    // Upcoming in window: departs 7:15 AM (15 min from now)
    trip('1202', 'Union Station', '7:15 AM', '8:15 AM'),
    // Upcoming in window: departs 7:45 AM (45 min from now)
    trip('1204', 'Union Station', '7:45 AM', '8:45 AM'),
    // Outside window: departs 8:30 AM
    trip('1206', 'Union Station', '8:30 AM', '9:30 AM'),
    // Saturday only — should be filtered out on a Monday
    trip('9999', 'Union Station', '7:10 AM', '8:10 AM', 'saturday'),
  ]

  it('shows active trains from realtime first, then upcoming in next 60 min', async () => {
    mockFetch.mockImplementation((feedType) =>
      Promise.resolve(
        feedType === 'tripupdates'
          ? tripUpdateFeed([
              {
                trainNumber: '1200',
                stopTimeUpdate: [
                  { stopSequence: 3, arrivalTime: epochAt(7, 32) },
                  { stopSequence: 4, arrivalTime: epochAt(7, 35) },
                ],
              },
            ])
          : emptyFeed(),
      ),
    )

    render(<MetraCurrentService lineSlug="bnsf" lineColor="#005595" trips={sampleTrips} />)

    await waitFor(() => {
      expect(screen.getByText('#1200')).toBeInTheDocument()
    })

    // Active train first
    expect(screen.getByText('#1200')).toBeInTheDocument()
    // Upcoming trains within 60 min window
    expect(screen.getByText('#1202')).toBeInTheDocument()
    expect(screen.getByText('#1204')).toBeInTheDocument()
    // Outside window
    expect(screen.queryByText('#1206')).not.toBeInTheDocument()
    // Wrong service type
    expect(screen.queryByText('#9999')).not.toBeInTheDocument()
  })

  it('labels the active train with a hero status (Delayed)', async () => {
    mockFetch.mockImplementation((feedType) =>
      Promise.resolve(
        feedType === 'tripupdates'
          ? tripUpdateFeed([
              {
                trainNumber: '1200',
                stopTimeUpdate: [
                  // Downers Grove scheduled 7:30, realtime 7:34 → 4 min late
                  { stopSequence: 3, arrivalTime: epochAt(7, 34) },
                  { stopSequence: 4, arrivalTime: epochAt(7, 34) + 180 },
                ],
              },
            ])
          : emptyFeed(),
      ),
    )

    render(<MetraCurrentService lineSlug="bnsf" lineColor="#005595" trips={sampleTrips} />)

    await waitFor(() => {
      expect(screen.getByText('Delayed 4 min')).toBeInTheDocument()
    })
  })

  it('links each row to the train detail page', async () => {
    mockFetch.mockResolvedValue(emptyFeed())
    render(<MetraCurrentService lineSlug="bnsf" lineColor="#005595" trips={sampleTrips} />)
    await waitFor(() => {
      expect(screen.getByText('#1202')).toBeInTheDocument()
    })
    const row = screen.getByTestId('current-service-row-1202')
    expect(row.closest('a')).toHaveAttribute('href', '/metra/bnsf/train/1202')
  })

  it('caps the list at 8 trains', async () => {
    const manyTrips: MetraLineTrip[] = Array.from({ length: 12 }, (_, i) =>
      trip(`T${i}`, 'Union Station', `7:${(i * 3).toString().padStart(2, '0')} AM`, '8:30 AM'),
    )
    mockFetch.mockResolvedValue(emptyFeed())
    render(<MetraCurrentService lineSlug="bnsf" lineColor="#005595" trips={manyTrips} />)

    await waitFor(() => {
      expect(screen.getByText('#T0')).toBeInTheDocument()
    })
    // Within 60 min window starting at 7:00 AM: 7:00, 7:03, 7:06, 7:09, 7:12, 7:15, 7:18, 7:21 (8 trains)
    // 7:24 and beyond: some are still in window, but cap limits to 8
    const rows = screen.getAllByTestId(/current-service-row-/)
    expect(rows.length).toBe(8)
  })

  it('falls back to next scheduled train when nothing is active or upcoming within window', async () => {
    const futureTrips: MetraLineTrip[] = [
      trip('LATE1', 'Union Station', '11:30 AM', '12:30 PM'),
      trip('LATE2', 'Union Station', '2:00 PM', '3:00 PM'),
    ]
    mockFetch.mockResolvedValue(emptyFeed())
    render(<MetraCurrentService lineSlug="bnsf" lineColor="#005595" trips={futureTrips} />)

    await waitFor(() => {
      expect(screen.getByText('#LATE1')).toBeInTheDocument()
    })
    // Only the next one, not both
    expect(screen.queryByText('#LATE2')).not.toBeInTheDocument()
    expect(screen.getByText(/Scheduled 11:30 AM/)).toBeInTheDocument()
  })

  it('renders loading skeleton before the first fetch resolves', () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    const { container } = render(
      <MetraCurrentService lineSlug="bnsf" lineColor="#005595" trips={sampleTrips} />,
    )
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('ignores entities on a different line', async () => {
    mockFetch.mockImplementation((feedType) =>
      Promise.resolve(
        feedType === 'tripupdates'
          ? ({
              header: {},
              entity: [
                {
                  id: '1',
                  tripUpdate: {
                    trip: {
                      tripId: 'UP-N_UP1200_V1_A',
                      routeId: 'UP-N',
                      startDate: FIXED_START_DATE,
                    },
                    stopTimeUpdate: [{ stopSequence: 2, arrival: { time: epochAt(7, 15) } }],
                  },
                },
              ],
            } as never)
          : emptyFeed(),
      ),
    )
    render(<MetraCurrentService lineSlug="bnsf" lineColor="#005595" trips={sampleTrips} />)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('tripupdates')
    })
    // BNSF page: no active trains from the UP-N entity. Upcoming list still shows.
    expect(screen.getByText('#1202')).toBeInTheDocument()
    // Should not label any train as "active" from the UP-N entity.
    // (All visible trains are scheduled, not delayed/on-time from realtime.)
  })

  it('re-fetches when tab regains visibility', async () => {
    mockFetch.mockResolvedValue(emptyFeed())
    render(<MetraCurrentService lineSlug="bnsf" lineColor="#005595" trips={sampleTrips} />)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })
    mockFetch.mockClear()

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })
  })
})
