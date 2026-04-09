import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import StationTimetable from '@components/StationTimetable'

// Fix current time to a Wednesday so the default tab is always "Weekday" in snapshots.
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
    now: new Date('2024-01-17T12:00:00.000Z'), // Wed Jan 17
  })
})
afterAll(() => {
  jest.useRealTimers()
})

const mockTrips = {
  weekday: [
    {
      tripId: 'trip-1',
      trainNumber: '1234',
      headsign: 'Aurora',
      departure: '6:10 AM',
      line: 'BNSF',
      lineSlug: 'bnsf',
      directionId: 0,
    },
    {
      tripId: 'trip-2',
      trainNumber: '1235',
      headsign: 'Union Station',
      departure: '7:00 AM',
      line: 'BNSF',
      lineSlug: 'bnsf',
      directionId: 1,
    },
  ],
  saturday: [
    {
      tripId: 'trip-3',
      trainNumber: '2001',
      headsign: 'Aurora',
      departure: '8:00 AM',
      line: 'BNSF',
      lineSlug: 'bnsf',
      directionId: 0,
    },
  ],
  sunday: [],
}

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => mockTrips,
  }) as jest.Mock
})

describe('StationTimetable', () => {
  it('renders nothing when fetch returns null', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as jest.Mock

    const { container } = render(<StationTimetable slug="aurora" />)
    await waitFor(() => {
      // Component returns null when data is null
      expect(container).toBeEmptyDOMElement()
    })
  })

  it('renders the Timetable heading after data loads', async () => {
    render(<StationTimetable slug="aurora" />)
    await waitFor(() => {
      expect(screen.getByText('Timetable')).toBeInTheDocument()
    })
  })

  it('renders direction filter buttons', async () => {
    render(<StationTimetable slug="aurora" />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Inbound' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Outbound' })).toBeInTheDocument()
    })
  })

  it('renders day selector buttons', async () => {
    render(<StationTimetable slug="aurora" />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Weekday' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Saturday' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Sunday' })).toBeInTheDocument()
    })
  })

  it('renders trip rows with departure times', async () => {
    render(<StationTimetable slug="aurora" />)
    await waitFor(() => {
      expect(screen.getByText('6:10 AM')).toBeInTheDocument()
      expect(screen.getByText('7:00 AM')).toBeInTheDocument()
    })
  })

  it('filters to outbound only when Outbound is clicked', async () => {
    render(<StationTimetable slug="aurora" />)
    await waitFor(() => screen.getByRole('button', { name: 'Outbound' }))

    fireEvent.click(screen.getByRole('button', { name: 'Outbound' }))

    expect(screen.getByText('6:10 AM')).toBeInTheDocument() // directionId 0 = outbound
    expect(screen.queryByText('7:00 AM')).not.toBeInTheDocument() // directionId 1 = inbound
  })

  it('shows no service message for Sunday', async () => {
    render(<StationTimetable slug="aurora" />)
    await waitFor(() => screen.getByRole('button', { name: 'Sunday' }))

    fireEvent.click(screen.getByRole('button', { name: 'Sunday' }))

    expect(screen.getByText(/no sunday service/i)).toBeInTheDocument()
  })

  it('renders trip links pointing to train detail pages', async () => {
    render(<StationTimetable slug="aurora" />)
    await waitFor(() => screen.getByText('6:10 AM'))

    const links = screen.getAllByRole('link')
    expect(links[0]).toHaveAttribute('href', '/metra/bnsf/train/trip-1')
  })

  it('matches snapshot', async () => {
    const { container } = render(<StationTimetable slug="aurora" />)
    await waitFor(() => screen.getByText('Timetable'))
    expect(container).toMatchSnapshot()
  })
})
