import { render, fireEvent } from '@testing-library/react-native'
import type { Favorite, StationSchedule } from '@ctt/shared'

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

import StationCard from '../../../../components/dashboard/cards/StationCard'
import { mockLine, mockMetraLine, mockStation, mockMetraStation } from '../../../fixtures'

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
    const { getByText, getAllByTestId } = render(
      <StationCard
        favorite={ctaFav}
        station={mockStation}
        lines={[mockLine]}
        onLongPress={() => {}}
        onMenuPress={() => {}}
      />,
    )
    expect(getByText('Toward Loop')).toBeTruthy()
    expect(getByText("Toward O'Hare")).toBeTruthy()
    expect(getAllByTestId('arrival-row')).toHaveLength(2)
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
    expect(getByText('Toward Loop')).toBeTruthy()
    expect(queryByText("Toward O'Hare")).toBeNull()
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
