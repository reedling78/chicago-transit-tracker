import { View, StyleSheet } from 'react-native'
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
      <View style={[styles.circle, { backgroundColor: theme.colors.bg.scrim }]}>
        <Ionicons name={iconName} size={28} color={theme.colors.text.onScrim} />
      </View>
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
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
