import { StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useAuth } from '../lib/AuthContext'
import { useTheme } from '../lib/theme'
import PressableButton from './PressableButton'

export default function HeaderUserIcon() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { theme } = useTheme()

  if (loading) return null

  const signedIn = !!user
  const label = signedIn ? 'Profile' : 'Sign in'
  const target = signedIn ? '/profile' : '/auth'
  const iconName = signedIn ? 'person-circle' : 'person-circle-outline'

  return (
    <PressableButton
      onPress={() => router.push(target as never)}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      feedback="subtle"
      style={styles.touchable}
    >
      <Ionicons name={iconName} size={28} color={theme.colors.text.primary} style={styles.icon} />
    </PressableButton>
  )
}

const styles = StyleSheet.create({
  touchable: {
    width: 44,
    height: 44,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Flat icon — a soft shadow keeps it legible over full-bleed photo headers
  // without the frosted-pill background.
  icon: {
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
})
