import { act, render, screen, waitFor } from '@testing-library/react'
import MetraTripRealtime, { type TripDetail } from '@components/MetraTripRealtime'
import { fetchMetraFeed } from '@lib/metra-realtime'

jest.mock('@lib/metra-realtime')
const mockFetch = fetchMetraFeed as jest.MockedFunction<typeof fetchMetraFeed>

// A future-dated startDate so scheduled times are in the future at test time.
const FUTURE_START_DATE = '21000101'
// Epoch seconds for 2100-01-01 05:30 local time (Aurora scheduled arrival).
const AURORA_SCHEDULED_EPOCH = Math.floor(new Date(2100, 0, 1, 5, 30, 0).getTime() / 1000)
const NAPERVILLE_SCHEDULED_EPOCH = Math.floor(new Date(2100, 0, 1, 5, 45, 0).getTime() / 1000)
const DOWNERS_SCHEDULED_EPOCH = Math.floor(new Date(2100, 0, 1, 6, 0, 0).getTime() / 1000)

const baseTrip: TripDetail = {
  tripId: 'bnsf_1234',
  trainNumber: '1234',
  headsign: 'Chicago Union Station',
  line: 'BNSF',
  lineSlug: 'bnsf',
  lineName: 'BNSF Railway Line',
  serviceType: 'weekday',
  directionId: 0,
  stops: [
    {
      sequence: 1,
      stationName: 'Aurora',
      slug: 'aurora',
      arrival: '5:30 AM',
      departure: '5:30 AM',
    },
    {
      sequence: 2,
      stationName: 'Naperville',
      slug: 'naperville',
      arrival: '5:45 AM',
      departure: '5:46 AM',
    },
    {
      sequence: 3,
      stationName: 'Downers Grove',
      slug: 'downers-grove',
      arrival: '6:00 AM',
      departure: '6:01 AM',
    },
    {
      sequence: 4,
      stationName: 'Union Station',
      slug: 'union-station',
      arrival: '6:30 AM',
      departure: '6:30 AM',
    },
  ],
}

function emptyFeed() {
  return { header: {}, entity: [] } as never
}

interface StuInput {
  stopSequence: number
  arrivalTime?: number
  departureTime?: number
  scheduleRelationship?: number
}

function tripUpdateFeed(stops: StuInput[]) {
  return {
    header: {},
    entity: [
      {
        id: '1',
        tripUpdate: {
          trip: { tripId: 'BNSF_BN1234_V1_A', routeId: 'BNSF', startDate: FUTURE_START_DATE },
          stopTimeUpdate: stops.map((s) => ({
            stopSequence: s.stopSequence,
            arrival: s.arrivalTime != null ? { time: s.arrivalTime } : undefined,
            departure: s.departureTime != null ? { time: s.departureTime } : undefined,
            scheduleRelationship: s.scheduleRelationship,
          })),
        },
      },
    ],
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
      'Date',
      'performance',
    ],
  })
})

afterEach(() => {
  jest.useRealTimers()
})

describe('MetraTripRealtime', () => {
  it('initial render matches the schedule exactly with no realtime decoration', () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    const { container } = render(<MetraTripRealtime trip={baseTrip} lineSlug="bnsf" />)

    expect(screen.getByText('Aurora')).toBeInTheDocument()
    expect(screen.getByText('Naperville')).toBeInTheDocument()
    expect(screen.getByText('Downers Grove')).toBeInTheDocument()
    expect(screen.getByText('Union Station')).toBeInTheDocument()

    // No status strip before any fetch resolves
    expect(screen.queryByText('Next stop')).not.toBeInTheDocument()
    expect(screen.queryByText(/On time/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Delayed/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Live tracking unavailable/)).not.toBeInTheDocument()

    // All stops default to "upcoming"
    const rows = container.querySelectorAll('[data-stop-sequence]')
    expect(rows.length).toBe(4)
    rows.forEach((row) => {
      expect(row.getAttribute('data-stop-status')).toBe('upcoming')
    })
  })

  it('marks past, current, and upcoming stops based on min STU sequence', async () => {
    mockFetch.mockImplementation((feedType) =>
      Promise.resolve(
        feedType === 'tripupdates'
          ? tripUpdateFeed([
              { stopSequence: 3, arrivalTime: DOWNERS_SCHEDULED_EPOCH },
              { stopSequence: 4, arrivalTime: DOWNERS_SCHEDULED_EPOCH + 1800 },
            ])
          : emptyFeed(),
      ),
    )

    const { container } = render(<MetraTripRealtime trip={baseTrip} lineSlug="bnsf" />)

    await waitFor(() => {
      expect(container.querySelector('[data-stop-status="current"]')).not.toBeNull()
    })

    const rows = container.querySelectorAll('[data-stop-sequence]')
    expect(rows[0].getAttribute('data-stop-status')).toBe('past')
    expect(rows[1].getAttribute('data-stop-status')).toBe('past')
    expect(rows[2].getAttribute('data-stop-status')).toBe('current')
    expect(rows[3].getAttribute('data-stop-status')).toBe('upcoming')

    // Hero card right panel shows the next stop spotlight
    expect(screen.getAllByText('Next stop').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Downers Grove').length).toBeGreaterThan(0)
  })

  it('shows a delay chip next to the delayed stop', async () => {
    // Naperville is 4 minutes late
    mockFetch.mockImplementation((feedType) =>
      Promise.resolve(
        feedType === 'tripupdates'
          ? tripUpdateFeed([
              { stopSequence: 2, arrivalTime: NAPERVILLE_SCHEDULED_EPOCH + 240 },
              { stopSequence: 3, arrivalTime: DOWNERS_SCHEDULED_EPOCH + 240 },
            ])
          : emptyFeed(),
      ),
    )
    render(<MetraTripRealtime trip={baseTrip} lineSlug="bnsf" />)
    await waitFor(() => {
      expect(screen.getAllByText('+4 min').length).toBeGreaterThan(0)
    })
  })

  it('shows a trip-level Delayed badge derived from the current stop', async () => {
    mockFetch.mockImplementation((feedType) =>
      Promise.resolve(
        feedType === 'tripupdates'
          ? tripUpdateFeed([
              { stopSequence: 2, arrivalTime: NAPERVILLE_SCHEDULED_EPOCH + 420 },
              { stopSequence: 3, arrivalTime: DOWNERS_SCHEDULED_EPOCH + 420 },
            ])
          : emptyFeed(),
      ),
    )
    render(<MetraTripRealtime trip={baseTrip} lineSlug="bnsf" />)
    await waitFor(() => {
      expect(screen.getByText('Delayed 7 min')).toBeInTheDocument()
    })
  })

  it('shows On time badge when the current stop has no delay', async () => {
    mockFetch.mockImplementation((feedType) =>
      Promise.resolve(
        feedType === 'tripupdates'
          ? tripUpdateFeed([
              { stopSequence: 1, arrivalTime: AURORA_SCHEDULED_EPOCH },
              { stopSequence: 2, arrivalTime: NAPERVILLE_SCHEDULED_EPOCH },
            ])
          : emptyFeed(),
      ),
    )
    render(<MetraTripRealtime trip={baseTrip} lineSlug="bnsf" />)
    await waitFor(() => {
      expect(screen.getByText('On time')).toBeInTheDocument()
    })
  })

  it('shows Skipped pill and line-through for a SKIPPED stop', async () => {
    mockFetch.mockImplementation((feedType) =>
      Promise.resolve(
        feedType === 'tripupdates'
          ? tripUpdateFeed([
              { stopSequence: 2, scheduleRelationship: 1 },
              { stopSequence: 3, arrivalTime: DOWNERS_SCHEDULED_EPOCH },
            ])
          : emptyFeed(),
      ),
    )
    render(<MetraTripRealtime trip={baseTrip} lineSlug="bnsf" />)
    await waitFor(() => {
      expect(screen.getByText('Skipped')).toBeInTheDocument()
    })
  })

  it('filters out entities that do not match the trip', async () => {
    const otherTrainFeed = {
      header: {},
      entity: [
        {
          id: '99',
          tripUpdate: {
            trip: { tripId: 'BNSF_BN9999_V1_A', routeId: 'BNSF', startDate: FUTURE_START_DATE },
            stopTimeUpdate: [{ stopSequence: 3, arrival: { time: DOWNERS_SCHEDULED_EPOCH } }],
          },
        },
      ],
    } as never
    mockFetch.mockResolvedValue(otherTrainFeed)
    render(<MetraTripRealtime trip={baseTrip} lineSlug="bnsf" />)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('tripupdates')
    })
    // No matching entity → hero card is hidden, schedule table still renders.
    expect(screen.queryByText('Live tracking unavailable')).not.toBeInTheDocument()
    expect(screen.queryByText('Next stop')).not.toBeInTheDocument()
    expect(screen.getByText('Aurora')).toBeInTheDocument()
  })

  it('shows Completed badge and Refresh button when stopTimeUpdate is empty', async () => {
    mockFetch.mockImplementation((feedType) =>
      Promise.resolve(feedType === 'tripupdates' ? tripUpdateFeed([]) : emptyFeed()),
    )
    render(<MetraTripRealtime trip={baseTrip} lineSlug="bnsf" />)
    await waitFor(() => {
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument()

    mockFetch.mockClear()
    act(() => {
      jest.advanceTimersByTime(30_000)
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('hides the hero card entirely when no live data is available for a non-scheduled trip', async () => {
    mockFetch.mockResolvedValue(emptyFeed())
    const { container } = render(<MetraTripRealtime trip={baseTrip} lineSlug="bnsf" />)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })
    expect(screen.queryByText('Live tracking unavailable')).not.toBeInTheDocument()
    expect(screen.queryByText(/LIVE STATUS/i)).not.toBeInTheDocument()
    // Schedule table still renders.
    expect(container.querySelectorAll('[data-stop-sequence]').length).toBe(4)
  })

  it('pauses polling while the tab is hidden and resumes on visibilitychange', async () => {
    mockFetch.mockResolvedValue(emptyFeed())
    render(<MetraTripRealtime trip={baseTrip} lineSlug="bnsf" />)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    mockFetch.mockClear()
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    })
    act(() => {
      jest.advanceTimersByTime(30_000)
    })
    expect(mockFetch).not.toHaveBeenCalled()

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
