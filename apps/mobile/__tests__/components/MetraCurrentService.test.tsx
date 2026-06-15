import { render, screen } from '@testing-library/react-native'
import type { MetraLineTrip } from '@ctt/shared'
import MetraCurrentService from '../../components/MetraCurrentService'
import { useMetraFeed } from '../../lib/useMetraFeed'

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('../../lib/useMetraFeed', () => ({
  useMetraFeed: jest.fn(() => ({ data: null, error: null, fetchedAt: null, loading: true })),
}))

const mockUseMetraFeed = useMetraFeed as jest.MockedFunction<typeof useMetraFeed>

// Fixed "now": a Monday (weekday service) at 9:00 AM so selection is deterministic.
const FIXED_NOW = new Date(2024, 0, 8, 9, 0, 0)

function scheduledTrip(trainNumber: string, dep: string, headsign = 'Aurora'): MetraLineTrip {
  return {
    trainNumber,
    headsign,
    serviceType: 'weekday',
    directionId: 0,
    stops: [
      {
        sequence: 1,
        stationName: 'Union Station',
        slug: 'union-station-metra',
        arrival: dep,
        departure: dep,
      },
      {
        sequence: 2,
        stationName: 'Aurora',
        slug: 'aurora-bnsf',
        arrival: '10:00 AM',
        departure: '10:00 AM',
      },
    ],
  }
}

beforeEach(() => {
  jest.useFakeTimers()
  jest.setSystemTime(FIXED_NOW)
  mockUseMetraFeed.mockReturnValue({ data: null, error: null, fetchedAt: null, loading: true })
})

afterEach(() => {
  jest.useRealTimers()
  mockUseMetraFeed.mockReset()
})

describe('MetraCurrentService', () => {
  it('subscribes to both the tripupdates and positions feeds', () => {
    mockUseMetraFeed.mockClear()
    render(<MetraCurrentService lineSlug="bnsf" lineColor="#005595" trips={[]} />)
    const feedTypes = mockUseMetraFeed.mock.calls.map((c) => c[0])
    expect(feedTypes).toContain('tripupdates')
    expect(feedTypes).toContain('positions')
  })

  it('renders an upcoming scheduled train row when no realtime data is present', () => {
    // A fetch has landed (fetchedAt set) but the feed has no matching entities.
    mockUseMetraFeed.mockReturnValue({
      data: { entity: [] } as never,
      error: null,
      fetchedAt: FIXED_NOW.getTime(),
      loading: false,
    })
    render(
      <MetraCurrentService
        lineSlug="bnsf"
        lineColor="#005595"
        trips={[scheduledTrip('1300', '9:15 AM')]}
      />,
    )
    expect(screen.getByText('#1300')).toBeOnTheScreen()
    expect(screen.getByText('Aurora')).toBeOnTheScreen()
    expect(screen.getByText('Next: Union Station · 9:15 AM')).toBeOnTheScreen()
    expect(screen.getByText('Scheduled 9:15 AM')).toBeOnTheScreen()
  })

  it('shows the "no more trains" message when there is no service to show', () => {
    mockUseMetraFeed.mockReturnValue({
      data: { entity: [] } as never,
      error: null,
      fetchedAt: FIXED_NOW.getTime(),
      loading: false,
    })
    render(<MetraCurrentService lineSlug="bnsf" lineColor="#005595" trips={[]} />)
    expect(screen.getByText('No more trains scheduled today.')).toBeOnTheScreen()
  })
})
