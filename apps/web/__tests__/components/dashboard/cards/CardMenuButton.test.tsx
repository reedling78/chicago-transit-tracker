/**
 * @jest-environment jsdom
 */
import { render, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import CardMenuButton from '@components/dashboard/cards/CardMenuButton'

describe('CardMenuButton', () => {
  it('fires onPress when clicked', () => {
    const onPress = jest.fn()
    const { getByLabelText } = render(
      <CardMenuButton
        onPress={onPress}
        isOpen={false}
        accessibilityLabel="Open menu for Red Line"
      />,
    )
    fireEvent.click(getByLabelText('Open menu for Red Line'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('reflects open state via aria-expanded', () => {
    const { getByLabelText, rerender } = render(
      <CardMenuButton onPress={() => {}} isOpen={false} accessibilityLabel="Open menu" />,
    )
    expect(getByLabelText('Open menu')).toHaveAttribute('aria-expanded', 'false')
    rerender(<CardMenuButton onPress={() => {}} isOpen={true} accessibilityLabel="Open menu" />)
    expect(getByLabelText('Open menu')).toHaveAttribute('aria-expanded', 'true')
  })

  it('renders the overflow glyph', () => {
    const { getByText } = render(
      <CardMenuButton onPress={() => {}} isOpen={false} accessibilityLabel="Open menu" />,
    )
    expect(getByText('⋯')).toBeInTheDocument()
  })

  it('stops propagation so the click does not reach the parent link', () => {
    const onPress = jest.fn()
    const onParentClick = jest.fn()
    const { getByLabelText } = render(
      <a href="/foo" onClick={onParentClick}>
        <CardMenuButton onPress={onPress} isOpen={false} accessibilityLabel="Open menu" />
      </a>,
    )
    fireEvent.click(getByLabelText('Open menu'))
    expect(onPress).toHaveBeenCalled()
    expect(onParentClick).not.toHaveBeenCalled()
  })
})
