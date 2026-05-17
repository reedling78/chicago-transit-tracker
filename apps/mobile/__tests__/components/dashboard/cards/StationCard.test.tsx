import { render, fireEvent } from '@testing-library/react-native'
import type { Favorite, FeedData, StationSchedule } from '@ctt/shared'

import StationCard from '../../../../components/dashboard/cards/StationCard'
import { mockLine, mockMetraLine, mockStation, mockMetraStation } from '../../../fixtures'
import { useMetraFeed } from '../../../../lib/useMetraFeed'

jest.mock('../../../../lib/useMetraFeed', () => ({
  useMetraFeed: jest.fn(() => ({ data: null, error: null, fetchedAt: null, loading: false })),
}))

const mockedUseMetraFeed = useMetraFeed as jest.MockedFunction<typeof useMetraFeed>

function makeTripFeed(opts: {
  trainNumber: string
  stopId: string
  departureTime?: number
  canceled?: boolean
}): FeedData {
  return {
    entity: [
      {
        tripUpdate: {
          trip: {
            routeId: 'BNSF',
            tripId: `BNSF_BN${opts.trainNumber}_V4_A`,
            scheduleRelationship: opts.canceled ? 3 : 0,
          },
          stopTimeUpdate: [
            {
              stopId: opts.stopId,
              scheduleRelationship: 0,
              departure: opts.departureTime != null ? { time: opts.departureTime } : undefined,
            },
          ],
        },
      },
    ],
  } as unknown as FeedData
}

const metraTripEntry = {
  tripId: 'BNSF_1234',
  trainNumber: '1234',
  headsign: 'Chicago',
  departure: '10:39 PM', // formatClockLabel(9999) === '10:39 PM'
  line: 'BNSF',
  lineSlug: 'bnsf',
  directionId: 1,
}
const metraTrips = {
  weekday: [metraTripEntry],
  saturday: [metraTripEntry],
  sunday: [metraTripEntry],
}
const metraSchedule: StationSchedule = {
  directions: [
    { headsign: 'Chicago', line: 'BNSF', weekday: [9999], saturday: [9999], sunday: [9999] },
  ],
}

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockScheduleQuery = jest.fn()
const mockTripsQuery = jest.fn()
jest.mock('../../../../lib/useDashboardQueries', () => ({
  useStationScheduleQuery: (slug: string | null) => mockScheduleQuery(slug),
  useStationTripsQuery: (slug: string | null, enabled: boolean) => mockTripsQuery(slug, enabled),
}))

const ctaFav: Favorite = { type: 'station', id: 'clark-lake', addedAt: '2026-04-25T10:00:00Z' }
const metraFav: Favorite = { type: 'station', id: 'aurora', addedAt: '2026-04-25T10:00:00Z' }

const ctaSchedule: StationSchedule = {
  directions: [
    { headsign: 'Loop', line: 'Red', weekday: [9999], saturday: [9999], sunday: [9999] },
    { headsign: "O'Hare", line: 'Blue', weekday: [9999], saturday: [9999], sunday: [9999] },
  ],
}

function loaded(data: StationSchedule | null) {
  return { data, isLoading: false, dataUpdatedAt: 1714137000000 }
}

beforeEach(() => {
  mockPush.mockClear()
  mockScheduleQuery.mockReset()
  mockTripsQuery.mockReset()
  mockScheduleQuery.mockReturnValue({ data: null, isLoading: true, dataUpdatedAt: 0 })
  mockTripsQuery.mockReturnValue({ data: null, isLoading: false, dataUpdatedAt: 0 })
  mockedUseMetraFeed.mockReset()
  mockedUseMetraFeed.mockReturnValue({ data: null, error: null, fetchedAt: null, loading: false })
})

describe('StationCard', () => {
  it('renders title, lines subtitle, and CTA meta tag', () => {
    const { getByText } = render(
      <StationCard
        favorite={ctaFav}
        station={mockStation}
        lines={[mockLine]}
        onLongPress={() => {}}
        onMenuPress={() => {}}
      />,
    )
    expect(getByText('Clark/Lake')).toBeTruthy()
    expect(getByText('Red • Blue • Green • Brown • Purple • Pink • Orange')).toBeTruthy()
    expect(getByText('CTA')).toBeTruthy()
  })

  it('renders Metra meta for Metra stations', () => {
    const { getByText } = render(
      <StationCard
        favorite={metraFav}
        station={mockMetraStation}
        lines={[mockMetraLine]}
        onLongPress={() => {}}
        onMenuPress={() => {}}
      />,
    )
    expect(getByText('Metra')).toBeTruthy()
  })

  it('navigates via the station route on press', () => {
    const { getByLabelText } = render(
      <StationCard
        favorite={ctaFav}
        station={mockStation}
        lines={[mockLine]}
        onLongPress={() => {}}
        onMenuPress={() => {}}
      />,
    )
    fireEvent.press(getByLabelText('Clark/Lake'))
    expect(mockPush).toHaveBeenCalledWith('/cta/station/clark-lake')
  })

  it('calls onMenuPress on overflow tap', () => {
    const onMenuPress = jest.fn()
    const { getByLabelText } = render(
      <StationCard
        favorite={ctaFav}
        station={mockStation}
        lines={[mockLine]}
        onLongPress={() => {}}
        onMenuPress={onMenuPress}
      />,
    )
    fireEvent.press(getByLabelText('Open menu for Clark/Lake'))
    expect(onMenuPress).toHaveBeenCalled()
  })

  it('renders the favorite id when station data has not loaded', () => {
    const { getByText } = render(
      <StationCard
        favorite={ctaFav}
        station={undefined}
        lines={undefined}
        onLongPress={() => {}}
        onMenuPress={() => {}}
      />,
    )
    expect(getByText('clark-lake')).toBeTruthy()
  })

  it('shows skeleton while schedule loads', () => {
    const { getByTestId } = render(
      <StationCard
        favorite={ctaFav}
        station={mockStation}
        lines={[mockLine]}
        onLongPress={() => {}}
        onMenuPress={() => {}}
      />,
    )
    expect(getByTestId('arrivals-skeleton')).toBeTruthy()
  })

  it('renders expanded arrivals grouped by headsign', () => {
    mockScheduleQuery.mockReturnValue(loaded(ctaSchedule))
    const { getByText, getAllByText, getAllByTestId } = render(
      <StationCard
        favorite={ctaFav}
        station={mockStation}
        lines={[mockLine]}
        onLongPress={() => {}}
        onMenuPress={() => {}}
      />,
    )
    expect(getByText('Service toward Loop')).toBeTruthy()
    expect(getByText("Service toward O'Hare")).toBeTruthy()
    const rows = getAllByTestId('arrival-row')
    expect(rows).toHaveLength(2)
    // Each row now carries the line/time label plus the scheduled-estimate marker.
    expect(getAllByText('≈')).toHaveLength(2)
  })

  it('renders compact rows when density is compact', () => {
    mockScheduleQuery.mockReturnValue(loaded(ctaSchedule))
    const compactFav: Favorite = { ...ctaFav, density: 'compact' }
    const { queryByTestId, getAllByTestId } = render(
      <StationCard
        favorite={compactFav}
        station={mockStation}
        lines={[mockLine]}
        onLongPress={() => {}}
        onMenuPress={() => {}}
      />,
    )
    expect(getAllByTestId('arrival-row-compact')).toHaveLength(2)
    expect(queryByTestId('arrival-row')).toBeNull()
  })

  it('filters CTA arrivals by headsign directionFilter', () => {
    mockScheduleQuery.mockReturnValue(loaded(ctaSchedule))
    const filtered: Favorite = { ...ctaFav, directionFilter: 'Loop' }
    const { getByText, queryByText } = render(
      <StationCard
        favorite={filtered}
        station={mockStation}
        lines={[mockLine]}
        onLongPress={() => {}}
        onMenuPress={() => {}}
      />,
    )
    expect(getByText('Service toward Loop')).toBeTruthy()
    expect(queryByText("Service toward O'Hare")).toBeNull()
  })

  it('shows a live indicator and last-updated when realtime matches a Metra row', () => {
    mockScheduleQuery.mockReturnValue(loaded(metraSchedule))
    mockTripsQuery.mockReturnValue({ data: metraTrips, isLoading: false, dataUpdatedAt: 0 })
    const predicted = Math.floor((Date.now() + 12 * 60_000) / 1000)
    mockedUseMetraFeed.mockReturnValue({
      data: makeTripFeed({ trainNumber: '1234', stopId: 'AURORA', departureTime: predicted }),
      error: null,
      fetchedAt: Date.now(),
      loading: false,
    })

    const { getByText, getByLabelText } = render(
      <StationCard
        favorite={metraFav}
        station={mockMetraStation}
        lines={[mockMetraLine]}
        onLongPress={() => {}}
        onMenuPress={() => {}}
      />,
    )

    expect(getByText(/Live · Last updated:/)).toBeTruthy()
    expect(getByLabelText('Live — based on Metra realtime data')).toBeTruthy()
    expect(getByText('12 min')).toBeTruthy()
  })

  it('shows a Cancelled treatment for canceled Metra trips', () => {
    mockScheduleQuery.mockReturnValue(loaded(metraSchedule))
    mockTripsQuery.mockReturnValue({ data: metraTrips, isLoading: false, dataUpdatedAt: 0 })
    mockedUseMetraFeed.mockReturnValue({
      data: makeTripFeed({ trainNumber: '1234', stopId: 'AURORA', canceled: true }),
      error: null,
      fetchedAt: Date.now(),
      loading: false,
    })

    const { getByText } = render(
      <StationCard
        favorite={metraFav}
        station={mockMetraStation}
        lines={[mockMetraLine]}
        onLongPress={() => {}}
        onMenuPress={() => {}}
      />,
    )

    expect(getByText('Cancelled')).toBeTruthy()
  })

  it('does not subscribe to the Metra feed for CTA stations', () => {
    mockScheduleQuery.mockReturnValue(loaded(ctaSchedule))
    render(
      <StationCard
        favorite={ctaFav}
        station={mockStation}
        lines={[mockLine]}
        onLongPress={() => {}}
        onMenuPress={() => {}}
      />,
    )
    expect(mockedUseMetraFeed).toHaveBeenCalledWith('tripupdates', { enabled: false })
  })

  it('only enables Metra trips query for Metra stations', () => {
    mockScheduleQuery.mockReturnValue(loaded(ctaSchedule))
    render(
      <StationCard
        favorite={ctaFav}
        station={mockStation}
        lines={[mockLine]}
        onLongPress={() => {}}
        onMenuPress={() => {}}
      />,
    )
    expect(mockTripsQuery).toHaveBeenCalledWith('clark-lake', false)
  })
})
