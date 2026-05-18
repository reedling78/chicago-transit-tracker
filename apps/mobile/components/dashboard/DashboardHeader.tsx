import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../lib/AuthContext'
import { useFavoritesStore } from '../../lib/store/favorites'
import { useTheme } from '../../lib/theme'
import type { Theme } from '../../lib/theme'
import PressableButton from '../PressableButton'

export default function DashboardHeader() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()
  const favorites = useFavoritesStore((s) => s.favorites)
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])

  if (loading) return null

  if (!user) {
    return (
      <View style={styles.unauthedHero}>
        <Text style={styles.heroTagline}>
          Real-time schedules, routes, and station info for every line in the Chicago metro area.
        </Text>
        <Text style={styles.heroPrompt}>
          Sign up to customize your dashboard with your favorite lines, stations, and trains.
        </Text>
        <View style={styles.heroButtonRow}>
          <PressableButton
            onPress={() => router.push('/auth?mode=signUp' as never)}
            style={[styles.heroButton, styles.primaryButton]}
            accessibilityRole="button"
            accessibilityLabel="Sign up"
            haptic="light"
          >
            <Text style={styles.primaryButtonText}>Sign up</Text>
          </PressableButton>
          <PressableButton
            onPress={() => router.push('/auth' as never)}
            style={[styles.heroButton, styles.secondaryButton]}
            accessibilityRole="button"
            accessibilityLabel="Log in"
          >
            <Text style={styles.secondaryButtonText}>Log in</Text>
          </PressableButton>
        </View>
      </View>
    )
  }

  const firstName = profile?.displayName?.split(' ')[0]
  const heading = firstName ? `Welcome back, ${firstName}` : 'Welcome back'

  return (
    <View style={styles.authedHeader}>
      <Text style={styles.heading}>{heading}</Text>
      {favorites.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the heart on any line, station, or train to save it here. Or jump in below:
          </Text>
          <View style={styles.quickLinkRow}>
            <PressableButton
              onPress={() => router.push('/cta' as never)}
              style={styles.quickLink}
              accessibilityRole="link"
              accessibilityLabel="Browse CTA"
              feedback="subtle"
            >
              <Text style={styles.quickLinkText}>Browse CTA →</Text>
            </PressableButton>
            <PressableButton
              onPress={() => router.push('/metra' as never)}
              style={styles.quickLink}
              accessibilityRole="link"
              accessibilityLabel="Browse Metra"
              feedback="subtle"
            >
              <Text style={styles.quickLinkText}>Browse Metra →</Text>
            </PressableButton>
          </View>
        </View>
      )}
    </View>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    unauthedHero: {
      paddingVertical: theme.space[8],
      paddingHorizontal: theme.space[2],
      marginBottom: theme.space[6],
      alignItems: 'center',
    },
    heroTagline: {
      color: theme.colors.text.secondary,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
      marginBottom: theme.space[6],
    },
    heroPrompt: {
      color: theme.colors.text.secondary,
      fontSize: 14,
      textAlign: 'center',
      marginBottom: theme.space[4],
    },
    heroButtonRow: {
      flexDirection: 'row',
      gap: theme.space[3],
      width: '100%',
      justifyContent: 'center',
    },
    heroButton: {
      paddingVertical: theme.space[3],
      paddingHorizontal: theme.space[5],
      borderRadius: theme.radius.sm + 2,
      minWidth: 120,
      alignItems: 'center',
    },
    primaryButton: { backgroundColor: theme.colors.accent.primary },
    primaryButtonText: {
      color: theme.colors.accent.primaryFg,
      fontSize: 14,
      fontWeight: '600',
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.border.strong,
    },
    secondaryButtonText: {
      color: theme.colors.text.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    authedHeader: { marginBottom: theme.space[4] },
    heading: {
      color: theme.colors.text.primary,
      fontSize: 22,
      fontWeight: '700',
      marginBottom: theme.space[3],
    },
    emptyCard: {
      backgroundColor: theme.colors.bg.surface,
      borderRadius: theme.radius.sm + 2,
      padding: theme.space[4],
    },
    emptyTitle: {
      color: theme.colors.text.primary,
      fontSize: 15,
      fontWeight: '600',
      marginBottom: theme.space[1],
    },
    emptySubtitle: {
      color: theme.colors.text.secondary,
      fontSize: 13,
      marginBottom: theme.space[3],
    },
    quickLinkRow: { gap: theme.space[2] },
    quickLink: {
      backgroundColor: theme.colors.bg.elevated,
      borderRadius: theme.radius.sm + 2,
      paddingVertical: theme.space[3],
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
    },
    quickLinkText: { color: theme.colors.text.primary, fontSize: 14, fontWeight: '600' },
  })
}
