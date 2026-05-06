import { Pressable, View, StyleSheet } from 'react-native'
import { useNavigation } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'

const HIT_SLOP = { top: 12, bottom: 12, left: 16, right: 12 }
const PRESS_RETENTION = { top: 24, bottom: 24, left: 24, right: 24 }

export default function HeaderBackButton() {
  const navigation = useNavigation()

  if (!navigation.canGoBack()) return null

  return (
    <Pressable
      onPress={() => navigation.goBack()}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={HIT_SLOP}
      pressRetentionOffset={PRESS_RETENTION}
      style={({ pressed }) => [styles.touchable, pressed && styles.pressed]}
    >
      <View style={styles.circle}>
        <Ionicons name="chevron-back" size={22} color="#fff" />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  touchable: {
    width: 48,
    height: 48,
    paddingLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
