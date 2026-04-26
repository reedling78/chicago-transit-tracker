import { render, fireEvent } from '@testing-library/react-native'
import type { Favorite } from '@ctt/shared'
import StationCard from '../../../../components/dashboard/cards/StationCard'
import { mockLine, mockMetraLine, mockStation, mockMetraStation } from '../../../fixtures'

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const ctaFav: Favorite = { type: 'station', id: 'clark-lake', addedAt: '2026-04-25T10:00:00Z' }
const metraFav: Favorite = { type: 'station', id: 'aurora', addedAt: '2026-04-25T10:00:00Z' }

beforeEach(() => {
  mockPush.mockClear()
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
})
