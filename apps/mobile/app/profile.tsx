import { ScrollView, Text, TouchableOpacity, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useNavHeaderInset } from '../lib/useNavHeaderInset'
import { useAuth } from '../lib/AuthContext'
import { signOut } from '../lib/auth'
import FavoritesManager from '../components/profile/FavoritesManager'

const providerLabels: Record<string, string> = {
  apple: 'Apple',
  google: 'Google',
  facebook: 'Facebook',
  password: 'Email & Password',
}

export default function ProfileScreen() {
  const { profile, loading } = useAuth()
  const router = useRouter()
  const headerInset = useNavHeaderInset()

  if (loading) {
    return (
      <View style={[styles.staticContainer, { paddingTop: headerInset + 24 }]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    )
  }

  if (!profile) {
    return (
      <View style={[styles.staticContainer, { paddingTop: headerInset + 24 }]}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.emptyText}>Sign in to view your profile.</Text>
        <TouchableOpacity style={styles.signInButton} onPress={() => router.replace('/auth')}>
          <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={[styles.scrollContent, { paddingTop: headerInset + 24 }]}
    >
      <Text style={styles.title}>Profile</Text>

      <View style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{profile.email || 'Not set'}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Sign-in Provider</Text>
          <Text style={styles.value}>{providerLabels[profile.provider] || profile.provider}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Member Since</Text>
          <Text style={styles.value}>
            {new Date(profile.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.signOutButton}
        onPress={async () => {
          await signOut()
          router.replace('/')
        }}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <FavoritesManager />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  staticContainer: {
    flex: 1,
    backgroundColor: '#0f0f23',
    padding: 24,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  loadingText: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
  },
  emptyText: {
    color: '#aaa',
    fontSize: 16,
    marginBottom: 20,
  },
  signInButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 20,
    gap: 16,
  },
  field: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  value: {
    fontSize: 16,
    color: '#fff',
  },
  signOutButton: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
