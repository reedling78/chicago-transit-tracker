import { TouchableOpacity, View, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useAuth } from '../lib/AuthContext'

export default function HeaderUserIcon() {
  const router = useRouter()
  const { user, loading } = useAuth()

  if (loading) return null

  const signedIn = !!user
  const label = signedIn ? 'Profile' : 'Sign in'
  const target = signedIn ? '/profile' : '/auth'
  const iconName = signedIn ? 'person-circle' : 'person-circle-outline'

  return (
    <TouchableOpacity
      onPress={() => router.push(target as never)}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={styles.touchable}
    >
      <View style={styles.circle}>
        <Ionicons name={iconName} size={28} color="#fff" />
      </View>
    </TouchableOpacity>
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
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
