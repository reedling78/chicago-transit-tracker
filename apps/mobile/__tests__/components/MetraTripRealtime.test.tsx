import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react-native'
import MetraTripRealtime from '../../components/MetraTripRealtime'
import type { TripDetail } from '../../components/MetraTripRealtime'
import { useMetraFeed } from '../../lib/useMetraFeed'

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}))

jest.mock('../../lib/useMetraFeed', () => ({
  useMetraFeed: jest.fn(() => ({
    data: null,
    error: null,
    fetchedAt: null,
    loading: false,
  })),
}))

const baseTrip: TripDetail = {
  tripId: 'BNSF_BN1200_V4',
  trainNumber: '1200',
  headsign: 'Aurora',
  line: 'BNSF',
  lineSlug: 'bnsf',
  lineName: 'BNSF Railway',
  serviceType: 'weekday',
  directionId: 0,
  stops: [
    {
      sequence: 1,
      stationName: 'Union Station',
      slug: 'union-station-metra',
      arrival: '5:30 AM',
      departure: '5:30 AM',
    },
    {
      sequence: 2,
      stationName: 'Western Ave',
      slug: 'western-ave-bnsf',
      arrival: '5:45 AM',
      departure: '5:46 AM',
    },
    {
      sequence: 3,
      stationName: 'Aurora',
      slug: 'aurora-bnsf',
      arrival: '6:30 AM',
      departure: '6:30 AM',
    },
  ],
}

describe('MetraTripRealtime', () => {
  it('renders the stop timeline before any realtime data arrives', () => {
    render(<MetraTripRealtime trip={baseTrip} lineSlug="bnsf" />)
    expect(screen.getByText('Union Station')).toBeOnTheScreen()
    expect(screen.getByText('Western Ave')).toBeOnTheScreen()
    expect(screen.getByText('Aurora')).toBeOnTheScreen()
  })

  it('does not render the hero card or footer until the first fetch lands', () => {
    render(<MetraTripRealtime trip={baseTrip} lineSlug="bnsf" />)
    expect(screen.queryByText('Live status')).toBeNull()
    expect(screen.queryByText(/Last updated/)).toBeNull()
  })

  it('subscribes to both tripupdates and positions feeds', () => {
    const mockUseMetraFeed = useMetraFeed as jest.MockedFunction<typeof useMetraFeed>
    mockUseMetraFeed.mockClear()
    render(<MetraTripRealtime trip={baseTrip} lineSlug="bnsf" />)
    const calls = mockUseMetraFeed.mock.calls
    const feedTypes = calls.map((c) => c[0])
    expect(feedTypes).toContain('tripupdates')
    expect(feedTypes).toContain('positions')
  })
})
