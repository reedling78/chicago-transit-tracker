import { render, fireEvent } from '@testing-library/react-native'
import CardMenuButton from '../../../../components/dashboard/cards/CardMenuButton'

describe('CardMenuButton', () => {
  it('fires onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByLabelText } = render(
      <CardMenuButton onPress={onPress} accessibilityLabel="Open menu for Red Line" />,
    )
    fireEvent.press(getByLabelText('Open menu for Red Line'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('renders the overflow glyph', () => {
    const { getByText } = render(
      <CardMenuButton onPress={() => {}} accessibilityLabel="Open menu" />,
    )
    expect(getByText('⋯')).toBeTruthy()
  })
})
