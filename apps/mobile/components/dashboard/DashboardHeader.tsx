import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../lib/AuthContext'
import { useFavoritesStore } from '../../lib/store/favorites'
import HeaderUserIcon from '../HeaderUserIcon'

export default function DashboardHeader() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()
  const favorites = useFavoritesStore((s) => s.favorites)

  if (loading) return null

  if (!user) {
    return (
      <View style={styles.unauthedHero}>
        <Text style={styles.heroHeadline}>Chicago Transit Tracker</Text>
        <Text style={styles.heroTagline}>
          Real-time schedules, routes, and station info for every line in the Chicago metro area.
        </Text>
        <Text style={styles.heroPrompt}>
          Sign up to customize your dashboard with your favorite lines, stations, and trains.
        </Text>
        <View style={styles.heroButtonRow}>
          <Pressable
            onPress={() => router.push('/auth?mode=signUp' as never)}
            style={[styles.heroButton, styles.primaryButton]}
            accessibilityRole="button"
            accessibilityLabel="Sign up"
          >
            <Text style={styles.primaryButtonText}>Sign up</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/auth' as never)}
            style={[styles.heroButton, styles.secondaryButton]}
            accessibilityRole="button"
            accessibilityLabel="Log in"
          >
            <Text style={styles.secondaryButtonText}>Log in</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  const firstName = profile?.displayName?.split(' ')[0]
  const heading = firstName ? `Welcome back, ${firstName}` : 'Chicago Transit Tracker'

  return (
    <View style={styles.authedHeader}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>{heading}</Text>
        <HeaderUserIcon />
      </View>
      {favorites.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the heart on any line, station, or train to save it here. Or jump in below:
          </Text>
          <View style={styles.quickLinkRow}>
            <Pressable
              onPress={() => router.push('/cta' as never)}
              style={styles.quickLink}
              accessibilityRole="link"
              accessibilityLabel="Browse CTA"
            >
              <Text style={styles.quickLinkText}>Browse CTA →</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/metra' as never)}
              style={styles.quickLink}
              accessibilityRole="link"
              accessibilityLabel="Browse Metra"
            >
              <Text style={styles.quickLinkText}>Browse Metra →</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  unauthedHero: {
    paddingVertical: 32,
    paddingHorizontal: 8,
    marginBottom: 24,
    alignItems: 'center',
  },
  heroHeadline: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroTagline: {
    color: '#9ca3af',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  heroPrompt: {
    color: '#d1d5db',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  heroButtonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  heroButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  primaryButton: { backgroundColor: '#2563eb' },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  secondaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  authedHeader: { marginBottom: 16 },
  headingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heading: { color: '#fff', fontSize: 22, fontWeight: '700', flexShrink: 1 },
  emptyCard: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 16,
  },
  emptyTitle: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  emptySubtitle: { color: '#9ca3af', fontSize: 13, marginBottom: 12 },
  quickLinkRow: { gap: 8 },
  quickLink: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#374151',
  },
  quickLinkText: { color: '#fff', fontSize: 14, fontWeight: '600' },
})
