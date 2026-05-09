import { Text } from 'react-native'
import { fireEvent, render } from '@testing-library/react-native'
import * as Haptics from 'expo-haptics'
import PressableButton, {
  resolvePressedStyle,
  resolveRipple,
} from '../../components/PressableButton'

jest.mock('expo-haptics', () => ({
  __esModule: true,
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  impactAsync: jest.fn(() => Promise.resolve()),
}))

const impactAsync = Haptics.impactAsync as jest.Mock

beforeEach(() => {
  impactAsync.mockClear()
})

describe('PressableButton', () => {
  it('renders children and forwards accessibility props', () => {
    const { getByLabelText, getByText } = render(
      <PressableButton accessibilityRole="button" accessibilityLabel="Open">
        <Text>Open</Text>
      </PressableButton>,
    )
    const node = getByLabelText('Open')
    expect(node).toBeOnTheScreen()
    expect(node.props.accessibilityRole).toBe('button')
    expect(getByText('Open')).toBeOnTheScreen()
  })

  it('fires onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByLabelText } = render(
      <PressableButton accessibilityLabel="Tap" onPress={onPress}>
        <Text>Tap</Text>
      </PressableButton>,
    )
    fireEvent.press(getByLabelText('Tap'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('does not fire haptics by default', () => {
    const { getByLabelText } = render(
      <PressableButton accessibilityLabel="Quiet" onPress={() => {}}>
        <Text>Quiet</Text>
      </PressableButton>,
    )
    fireEvent.press(getByLabelText('Quiet'))
    expect(impactAsync).not.toHaveBeenCalled()
  })

  it('triggers expo-haptics when haptic is enabled', () => {
    const { getByLabelText } = render(
      <PressableButton accessibilityLabel="Buzz" haptic="light" onPress={() => {}}>
        <Text>Buzz</Text>
      </PressableButton>,
    )
    fireEvent.press(getByLabelText('Buzz'))
    expect(impactAsync).toHaveBeenCalledTimes(1)
    expect(impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light)
  })

  it('maps medium and heavy haptic tones to the right impact style', () => {
    const { getByLabelText: g1 } = render(
      <PressableButton accessibilityLabel="M" haptic="medium" onPress={() => {}}>
        <Text>M</Text>
      </PressableButton>,
    )
    fireEvent.press(g1('M'))
    expect(impactAsync).toHaveBeenLastCalledWith(Haptics.ImpactFeedbackStyle.Medium)

    const { getByLabelText: g2 } = render(
      <PressableButton accessibilityLabel="H" haptic="heavy" onPress={() => {}}>
        <Text>H</Text>
      </PressableButton>,
    )
    fireEvent.press(g2('H'))
    expect(impactAsync).toHaveBeenLastCalledWith(Haptics.ImpactFeedbackStyle.Heavy)
  })

  it('resolves ripple defaults, opt-out, and merge cases', () => {
    expect(resolveRipple(undefined)).toEqual({ color: 'rgba(255,255,255,0.15)', borderless: false })
    expect(resolveRipple(true)).toEqual({ color: 'rgba(255,255,255,0.15)', borderless: false })
    expect(resolveRipple(false)).toBeNull()
    expect(resolveRipple({ color: '#ff0000', borderless: true })).toEqual({
      color: '#ff0000',
      borderless: true,
    })
  })

  it('produces a scale + opacity style only when pressed and feedback is enabled', () => {
    expect(resolvePressedStyle('default', false)).toBeNull()
    expect(resolvePressedStyle('none', true)).toBeNull()
    expect(resolvePressedStyle('default', true)).toEqual({
      opacity: 0.92,
      transform: [{ scale: 0.96 }],
    })
    expect(resolvePressedStyle('subtle', true)).toEqual({
      opacity: 0.96,
      transform: [{ scale: 0.98 }],
    })
  })

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn()
    const { getByLabelText } = render(
      <PressableButton accessibilityLabel="Off" disabled onPress={onPress}>
        <Text>Off</Text>
      </PressableButton>,
    )
    fireEvent.press(getByLabelText('Off'))
    expect(onPress).not.toHaveBeenCalled()
  })

  it('forwards hitSlop to the underlying Pressable when provided', () => {
    const { getByLabelText } = render(
      <PressableButton accessibilityLabel="Hit" hitSlop={12}>
        <Text>Hit</Text>
      </PressableButton>,
    )
    expect(getByLabelText('Hit').props.hitSlop).toBe(12)
  })
})
