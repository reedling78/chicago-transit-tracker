import { Pressable, Text, StyleSheet } from 'react-native'

interface CardMenuButtonProps {
  onPress: () => void
  accessibilityLabel: string
}

export default function CardMenuButton({ onPress, accessibilityLabel }: CardMenuButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.glyph}>⋯</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  pressed: {
    backgroundColor: '#374151',
  },
  glyph: {
    color: '#9ca3af',
    fontSize: 20,
    lineHeight: 20,
    fontWeight: '700',
  },
})
