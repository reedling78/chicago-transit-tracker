import { render, screen, waitFor } from '@testing-library/react'
import Arrivals from '@/app/components/Arrivals'

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

beforeEach(() => {
  jest.clearAllMocks()
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
})
