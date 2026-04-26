import { render, fireEvent } from '@testing-library/react-native'
import type { Favorite } from '@ctt/shared'
import LineCard from '../../../../components/dashboard/cards/LineCard'
import { mockLine } from '../../../fixtures'

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const fav: Favorite = { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }

beforeEach(() => {
  mockPush.mockClear()
})

describe('LineCard', () => {
  it('renders the line name and termini subtitle', () => {
    const { getByText } = render(
      <LineCard favorite={fav} line={mockLine} onLongPress={() => {}} onMenuPress={() => {}} />,
    )
    expect(getByText('Red Line')).toBeTruthy()
    expect(getByText('Howard — 95th/Dan Ryan')).toBeTruthy()
    expect(getByText('Red')).toBeTruthy()
  })

  it('navigates to the line route on press', () => {
    const { getByLabelText } = render(
      <LineCard favorite={fav} line={mockLine} onLongPress={() => {}} onMenuPress={() => {}} />,
    )
    fireEvent.press(getByLabelText('Red Line'))
    expect(mockPush).toHaveBeenCalledWith('/cta/red')
  })

  it('calls onLongPress when the card is long-pressed', () => {
    const onLongPress = jest.fn()
    const { getByLabelText } = render(
      <LineCard favorite={fav} line={mockLine} onLongPress={onLongPress} onMenuPress={() => {}} />,
    )
    fireEvent(getByLabelText('Red Line'), 'longPress')
    expect(onLongPress).toHaveBeenCalled()
  })

  it('opens the menu when the overflow button is tapped', () => {
    const onMenuPress = jest.fn()
    const { getByLabelText } = render(
      <LineCard favorite={fav} line={mockLine} onLongPress={() => {}} onMenuPress={onMenuPress} />,
    )
    fireEvent.press(getByLabelText('Open menu for Red Line'))
    expect(onMenuPress).toHaveBeenCalledTimes(1)
  })

  it('falls back to the favorite id when the line has not loaded yet', () => {
    const { getByText, queryByText } = render(
      <LineCard favorite={fav} line={undefined} onLongPress={() => {}} onMenuPress={() => {}} />,
    )
    expect(getByText('red')).toBeTruthy()
    expect(queryByText('Red Line')).toBeNull()
  })
})
