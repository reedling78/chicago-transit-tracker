import { forwardRef, useCallback, type ReactNode } from 'react'
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type View,
  type ViewStyle,
} from 'react-native'
import * as Haptics from 'expo-haptics'

export type PressableButtonFeedback = 'default' | 'subtle' | 'none'
export type PressableButtonHaptic = 'light' | 'medium' | 'heavy'
export type PressableButtonRipple =
  | boolean
  | { color?: string; borderless?: boolean; radius?: number; foreground?: boolean }

const SCALE: Record<PressableButtonFeedback, number> = {
  default: 0.96,
  subtle: 0.98,
  none: 1,
}

const OPACITY: Record<PressableButtonFeedback, number> = {
  default: 0.92,
  subtle: 0.96,
  none: 1,
}

const DEFAULT_RIPPLE = { color: 'rgba(255,255,255,0.15)', borderless: false }

export interface PressableButtonProps extends Omit<
  PressableProps,
  'style' | 'children' | 'android_ripple'
> {
  feedback?: PressableButtonFeedback
  haptic?: false | PressableButtonHaptic
  androidRipple?: PressableButtonRipple
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>)
  children?: ReactNode | ((state: PressableStateCallbackType) => ReactNode)
}

export function resolveRipple(ripple: PressableButtonRipple | undefined) {
  if (ripple === false) return null
  if (ripple === undefined || ripple === true) return DEFAULT_RIPPLE
  return { ...DEFAULT_RIPPLE, ...ripple }
}

export function resolvePressedStyle(
  feedback: PressableButtonFeedback,
  pressed: boolean,
): ViewStyle | null {
  if (!pressed || feedback === 'none') return null
  return { opacity: OPACITY[feedback], transform: [{ scale: SCALE[feedback] }] }
}

function hapticStyleFor(tone: PressableButtonHaptic): Haptics.ImpactFeedbackStyle {
  if (tone === 'medium') return Haptics.ImpactFeedbackStyle.Medium
  if (tone === 'heavy') return Haptics.ImpactFeedbackStyle.Heavy
  return Haptics.ImpactFeedbackStyle.Light
}

const PressableButton = forwardRef<View, PressableButtonProps>(function PressableButton(
  {
    feedback = 'default',
    haptic = false,
    androidRipple,
    onPress,
    style,
    children,
    disabled,
    ...rest
  },
  ref,
) {
  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      if (haptic) {
        Haptics.impactAsync(hapticStyleFor(haptic)).catch(() => {
          // Haptics are best-effort; failures (unsupported device, perms) are non-fatal.
        })
      }
      onPress?.(event)
    },
    [haptic, onPress],
  )

  const composedStyle = (state: PressableStateCallbackType): StyleProp<ViewStyle> => {
    const consumerStyle = typeof style === 'function' ? style(state) : style
    return [consumerStyle, resolvePressedStyle(feedback, state.pressed)]
  }

  return (
    <Pressable
      ref={ref}
      {...rest}
      disabled={disabled}
      onPress={handlePress}
      android_ripple={resolveRipple(androidRipple)}
      style={composedStyle}
    >
      {children as PressableProps['children']}
    </Pressable>
  )
})

export default PressableButton
