import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../lib/AuthContext'
import { signOut } from '../../lib/auth'
import { useTheme, type Theme, type ThemeModeSetting } from '../../lib/theme'
import PressableButton from '../PressableButton'

const THEME_MODES: { value: ThemeModeSetting; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

const providerLabels: Record<string, string> = {
  apple: 'Apple',
  google: 'Google',
  password: 'Email & Password',
}

function ThemeToggle() {
  const { mode, setMode, theme } = useTheme()
  const styles = useMemo(() => makeToggleStyles(theme), [theme])
  return (
    <View testID="theme-toggle" style={styles.container}>
      <Text style={styles.label}>Theme</Text>
      <View style={styles.row}>
        {THEME_MODES.map((opt) => {
          const active = mode === opt.value
          return (
            <PressableButton
              key={opt.value}
              onPress={() => setMode(opt.value)}
              feedback="subtle"
              accessibilityRole="button"
              accessibilityLabel={`Theme: ${opt.label}`}
              accessibilityState={{ selected: active }}
              style={[styles.segment, active ? styles.segmentActive : styles.segmentInactive]}
            >
              <Text style={active ? styles.segmentTextActive : styles.segmentTextInactive}>
                {opt.label}
              </Text>
            </PressableButton>
          )
        })}
      </View>
    </View>
  )
}

export default function ProfilePanel() {
  const { profile, loading } = useAuth()
  const router = useRouter()
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])

  if (loading) {
    return <Text style={styles.loadingText}>Loading...</Text>
  }

  if (!profile) {
    return (
      <View style={styles.gap}>
        <Text style={styles.emptyText}>Sign in to view your profile.</Text>
        <PressableButton
          style={styles.signInButton}
          onPress={() => router.replace('/auth')}
          haptic="light"
          accessibilityRole="button"
          accessibilityLabel="Sign In"
        >
          <Text style={styles.signInButtonText}>Sign In</Text>
        </PressableButton>
        <ThemeToggle />
      </View>
    )
  }

  return (
    <View style={styles.gap}>
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

      <ThemeToggle />

      <PressableButton
        style={styles.signOutButton}
        onPress={async () => {
          await signOut()
          router.replace('/')
        }}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel="Sign Out"
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </PressableButton>
    </View>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    gap: { gap: theme.space[4] },
    loadingText: { color: theme.colors.text.secondary, fontSize: 16 },
    emptyText: { color: theme.colors.text.secondary, fontSize: 16 },
    signInButton: {
      backgroundColor: theme.colors.accent.primary,
      borderRadius: theme.radius.md - 2,
      padding: 14,
      alignItems: 'center',
    },
    signInButtonText: { color: theme.colors.accent.primaryFg, fontSize: 16, fontWeight: '600' },
    card: {
      backgroundColor: theme.colors.bg.surface,
      borderRadius: theme.radius.md,
      padding: theme.space[5],
      gap: theme.space[4],
    },
    field: { gap: theme.space[1] },
    label: { fontSize: 13, fontWeight: '600', color: theme.colors.text.secondary },
    value: { fontSize: 16, color: theme.colors.text.primary },
    signOutButton: {
      backgroundColor: theme.colors.status.delayed,
      borderRadius: theme.radius.md - 2,
      padding: 14,
      alignItems: 'center',
    },
    signOutText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  })
}

function makeToggleStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.bg.surface,
      borderColor: theme.colors.border.subtle,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.space[3],
      gap: theme.space[2],
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      color: theme.colors.text.secondary,
    },
    row: { flexDirection: 'row', gap: theme.space[2] },
    segment: {
      flex: 1,
      paddingVertical: theme.space[2],
      paddingHorizontal: theme.space[3],
      borderRadius: theme.radius.sm + 2,
      borderWidth: 1,
      alignItems: 'center',
    },
    segmentActive: {
      backgroundColor: theme.colors.accent.primary,
      borderColor: theme.colors.accent.primary,
    },
    segmentInactive: { backgroundColor: 'transparent', borderColor: theme.colors.border.subtle },
    segmentTextActive: { color: theme.colors.accent.primaryFg, fontWeight: '600', fontSize: 13 },
    segmentTextInactive: { color: theme.colors.text.primary, fontWeight: '600', fontSize: 13 },
  })
}
