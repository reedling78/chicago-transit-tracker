import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../lib/AuthContext'

function firstName(profile: { displayName: string | null } | null): string | null {
  if (!profile?.displayName) return null
  return profile.displayName.split(' ')[0] || null
}

export default function DashboardHeader() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  if (loading) return <View style={styles.placeholder} />

  const greeting = user
    ? firstName(profile)
      ? `Welcome back, ${firstName(profile)}`
      : 'Welcome back'
    : 'Chicago Transit Tracker'

  return (
    <View style={styles.row}>
      <Text style={styles.heading}>{greeting}</Text>
      <Pressable
        onPress={() => router.push((user ? '/profile' : '/auth') as never)}
        accessibilityRole="button"
        accessibilityLabel={user ? 'Profile' : 'Sign in'}
        style={styles.button}
      >
        <Text style={styles.buttonText}>{user ? 'Profile' : 'Sign in'}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  placeholder: { height: 56 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  heading: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  buttonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
})
