import { render, fireEvent } from '@testing-library/react-native'
import type { Favorite } from '@ctt/shared'
import TrainCard from '../../../../components/dashboard/cards/TrainCard'

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockUseFavoriteTripQuery = jest.fn()
jest.mock('../../../../lib/useDashboardQueries', () => ({
  useFavoriteTripQuery: (tripId: string | null) => mockUseFavoriteTripQuery(tripId),
}))

const fav: Favorite = { type: 'train', id: 'bnsf_1234', addedAt: '2026-04-25T10:00:00Z' }

beforeEach(() => {
  mockPush.mockClear()
  mockUseFavoriteTripQuery.mockReset()
})

describe('TrainCard', () => {
  it('renders the train number, headsign subtitle, and service-type meta', () => {
    mockUseFavoriteTripQuery.mockReturnValue({
      data: {
        trainNumber: '1234',
        line: 'BNSF',
        lineName: 'BNSF',
        headsign: 'Chicago',
        serviceType: 'Weekday',
      },
    })
    const { getByText } = render(
      <TrainCard favorite={fav} onLongPress={() => {}} onMenuPress={() => {}} />,
    )
    expect(getByText('Train 1234')).toBeTruthy()
    expect(getByText('To Chicago')).toBeTruthy()
    expect(getByText('Weekday')).toBeTruthy()
  })

  it('shows the placeholder subtitle when trip data is missing', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: null })
    const { getByText } = render(
      <TrainCard
        favorite={{ type: 'train', id: 'bnsf_9999', addedAt: '2026-04-25T10:00:00Z' }}
        onLongPress={() => {}}
        onMenuPress={() => {}}
      />,
    )
    expect(getByText('Train 9999')).toBeTruthy()
    expect(getByText('Trip not currently scheduled')).toBeTruthy()
  })

  it('navigates to /metra/{line}/train/{trainNumber} on press', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: null })
    const { getByLabelText } = render(
      <TrainCard favorite={fav} onLongPress={() => {}} onMenuPress={() => {}} />,
    )
    fireEvent.press(getByLabelText('Train 1234'))
    expect(mockPush).toHaveBeenCalledWith('/metra/bnsf/train/1234')
  })

  it('opens the menu on overflow tap', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: null })
    const onMenuPress = jest.fn()
    const { getByLabelText } = render(
      <TrainCard favorite={fav} onLongPress={() => {}} onMenuPress={onMenuPress} />,
    )
    fireEvent.press(getByLabelText('Open menu for Train 1234'))
    expect(onMenuPress).toHaveBeenCalled()
  })
})
