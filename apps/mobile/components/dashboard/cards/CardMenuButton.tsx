import { Text, StyleSheet } from 'react-native'
import { useTheme } from '../../../lib/theme'
import PressableButton from '../../PressableButton'

interface CardMenuButtonProps {
  onPress: () => void
  accessibilityLabel: string
}

export default function CardMenuButton({ onPress, accessibilityLabel }: CardMenuButtonProps) {
  const { theme } = useTheme()
  return (
    <PressableButton
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      feedback="default"
      haptic="light"
      style={[styles.button, { borderRadius: theme.radius.lg }]}
    >
      <Text style={[styles.glyph, { color: theme.colors.text.secondary }]}>⋯</Text>
    </PressableButton>
  )
}

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 20,
    lineHeight: 20,
    fontWeight: '700',
  },
})
