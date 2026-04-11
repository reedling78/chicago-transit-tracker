import { render, screen, waitFor } from '@testing-library/react'
import Arrivals, { formatMinutesAway } from '@components/Arrivals'

// Fix current time to Monday 01:00 AM local so arrival times are stable in snapshots.
// Fake only Date (not setTimeout/setInterval) so waitFor's internal polling still works.
beforeAll(() => {
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
    ],
    now: new Date('2024-01-15T07:00:00.000Z'), // Mon Jan 15 01:00 AM CST
  })
})
afterAll(() => {
  jest.useRealTimers()
})

const mockSchedule = {
  directions: [
    {
      headsign: '95th/Dan Ryan',
      line: 'Red',
      weekday: [
        0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720, 780, 840, 900, 960, 1020,
        1080, 1140, 1200, 1260, 1320, 1380, 1440, 1500,
      ],
      saturday: [],
      sunday: [],
    },
  ],
}

// Metra schedule: Mondays at 01:00 means the next two weekday departures are
// 62 (=1:02 AM) and 125 (=2:05 AM). The station-trips mock below matches the
// first by (headsign, line, formatted departure) so it should render as a Link.
const mockMetraSchedule = {
  directions: [
    {
      headsign: 'Aurora',
      line: 'BNSF',
      weekday: [62, 125],
      saturday: [],
      sunday: [],
    },
  ],
}

const mockMetraStationTrips = {
  weekday: [
    {
      tripId: 'bnsf_1234',
      trainNumber: '1234',
      headsign: 'Aurora',
      departure: '1:02 AM',
      line: 'BNSF',
      lineSlug: 'bnsf',
      directionId: 0,
    },
  ],
  saturday: [],
  sunday: [],
}

beforeEach(() => {
  jest.clearAllMocks()
})

// Helper: route fetch mocks by URL so schedule + station-trips can both be stubbed.
function mockFetchByUrl(routes: Record<string, unknown>) {
  global.fetch = jest.fn((url: string) => {
    for (const [prefix, payload] of Object.entries(routes)) {
      if (url.startsWith(prefix)) {
        return Promise.resolve({ ok: true, json: async () => payload })
      }
    }
    return Promise.resolve({ ok: false })
  }) as jest.Mock
}

describe('formatMinutesAway', () => {
  it('returns "Due" when less than 1 minute away', () => {
    expect(formatMinutesAway(0)).toBe('Due')
  })

  it('returns "X min" for values under an hour', () => {
    expect(formatMinutesAway(1)).toBe('1 min')
    expect(formatMinutesAway(13)).toBe('13 min')
    expect(formatMinutesAway(56)).toBe('56 min')
    expect(formatMinutesAway(59)).toBe('59 min')
  })

  it('returns "Xh" when the value is an exact hour', () => {
    expect(formatMinutesAway(60)).toBe('1h')
    expect(formatMinutesAway(120)).toBe('2h')
    expect(formatMinutesAway(180)).toBe('3h')
  })

  it('returns "Xh Ym" for values over an hour with remainder minutes', () => {
    expect(formatMinutesAway(75)).toBe('1h 15m')
    expect(formatMinutesAway(116)).toBe('1h 56m')
    expect(formatMinutesAway(150)).toBe('2h 30m')
    expect(formatMinutesAway(237)).toBe('3h 57m')
  })
})

describe('Arrivals', () => {
  it('renders nothing when hasSchedule is false', () => {
    const { container } = render(<Arrivals slug="clark-lake" service="cta" hasSchedule={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the schedule header when hasSchedule is true', () => {
    // Never-resolving fetch keeps component in loading state — no async state updates
    global.fetch = jest.fn().mockImplementation(() => new Promise(() => {})) as jest.Mock

    render(<Arrivals slug="clark-lake" service="cta" hasSchedule={true} />)
    expect(screen.getByText(/scheduled arrivals/i)).toBeInTheDocument()
  })

  it('shows loading skeleton initially', () => {
    global.fetch = jest.fn().mockImplementation(
      () => new Promise(() => {}), // never resolves
    ) as jest.Mock

    render(<Arrivals slug="clark-lake" service="cta" hasSchedule={true} />)
    // Skeleton rows are divs with no text — verify the loading state header is present
    expect(screen.getByText(/scheduled arrivals/i)).toBeInTheDocument()
    expect(screen.queryByText('95th/Dan Ryan')).not.toBeInTheDocument()
  })

  it('renders arrival rows after fetch resolves', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSchedule,
    }) as jest.Mock

    render(<Arrivals slug="clark-lake" service="cta" hasSchedule={true} />)

    await waitFor(() => {
      expect(screen.getAllByText('95th/Dan Ryan').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows error message when fetch fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as jest.Mock

    render(<Arrivals slug="clark-lake" service="cta" hasSchedule={true} />)

    await waitFor(() => {
      expect(screen.getByText(/schedule data unavailable/i)).toBeInTheDocument()
    })
  })

  it('shows no departures message when schedule has no upcoming times', async () => {
    const emptySchedule = {
      directions: [
        { headsign: '95th/Dan Ryan', line: 'Red', weekday: [], saturday: [], sunday: [] },
      ],
    }
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => emptySchedule,
    }) as jest.Mock

    render(<Arrivals slug="clark-lake" service="cta" hasSchedule={true} />)

    await waitFor(() => {
      expect(screen.getByText(/no upcoming departures/i)).toBeInTheDocument()
    })
  })

  it('matches snapshot in loaded state', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSchedule,
    }) as jest.Mock

    const { container } = render(<Arrivals slug="clark-lake" service="cta" hasSchedule={true} />)

    await waitFor(() => {
      expect(screen.getAllByText('95th/Dan Ryan').length).toBeGreaterThanOrEqual(1)
    })

    expect(container).toMatchSnapshot()
  })

  it('renders CTA arrival rows as plain divs, never as links', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSchedule,
    }) as jest.Mock

    render(<Arrivals slug="clark-lake" service="cta" hasSchedule={true} />)

    await waitFor(() => {
      expect(screen.getAllByText('95th/Dan Ryan').length).toBeGreaterThanOrEqual(1)
    })

    // No anchor tags — CTA has no train detail page
    expect(document.querySelectorAll('a[href^="/metra/"]')).toHaveLength(0)
  })

  it('links Metra arrival rows to the train detail page when a trip match exists', async () => {
    mockFetchByUrl({
      '/api/schedules/': mockMetraSchedule,
      '/api/metra/station-trips/': mockMetraStationTrips,
    })

    render(<Arrivals slug="union-station-metra" service="metra" hasSchedule={true} />)

    await waitFor(() => {
      expect(screen.getAllByText('Aurora').length).toBeGreaterThanOrEqual(1)
    })

    // The 1:02 AM row should be wrapped in a Link
    const link = document.querySelector('a[href="/metra/bnsf/train/bnsf_1234"]')
    expect(link).not.toBeNull()

    // The 2:05 AM row has no matching trip entry, so it should remain a plain div
    expect(document.querySelectorAll('a[href^="/metra/"]')).toHaveLength(1)
  })

  it('still renders Metra arrivals when station-trips fetch fails', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.startsWith('/api/schedules/')) {
        return Promise.resolve({ ok: true, json: async () => mockMetraSchedule })
      }
      // station-trips fetch fails — arrivals should still render, just unlinked
      return Promise.resolve({ ok: false })
    }) as jest.Mock

    render(<Arrivals slug="union-station-metra" service="metra" hasSchedule={true} />)

    await waitFor(() => {
      expect(screen.getAllByText('Aurora').length).toBeGreaterThanOrEqual(1)
    })

    expect(document.querySelectorAll('a[href^="/metra/"]')).toHaveLength(0)
  })
})
