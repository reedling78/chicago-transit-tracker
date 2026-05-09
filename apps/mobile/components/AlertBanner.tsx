import { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useAlerts } from '../lib/hooks'
import { useTheme } from '../lib/theme'
import type { Theme } from '../lib/theme'
import PressableButton from './PressableButton'

type AlertBannerProps = {
  service: 'cta' | 'metra'
  href: string
}

// Warning amber accents are intentionally fixed across themes — the alert
// banner reads as "warning" by color regardless of light/dark mode.
const AMBER = '#fbbf24'
const AMBER_BG = 'rgba(251, 191, 36, 0.08)'
const AMBER_BORDER = 'rgba(251, 191, 36, 0.2)'
const AMBER_ICON = 'rgba(251, 191, 36, 0.15)'

export default function AlertBanner({ service, href }: AlertBannerProps) {
  const { alerts, loading } = useAlerts(service)
  const router = useRouter()
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
  const count = alerts.length

  return (
    <PressableButton
      onPress={() => router.push(href as never)}
      accessibilityRole="link"
      accessibilityLabel="Service Alerts"
      feedback="subtle"
      style={styles.card}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>⚠</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Service Alerts</Text>
        <Text style={styles.subtitle}>
          {loading ? 'Checking for alerts...' : `${count} active alert${count !== 1 ? 's' : ''}`}
        </Text>
      </View>
      {!loading && count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      )}
      <Text style={styles.chevron}>→</Text>
    </PressableButton>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: AMBER_BG,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: AMBER_BORDER,
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: theme.space[3],
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.full,
      backgroundColor: AMBER_ICON,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: { fontSize: 18 },
    content: { flex: 1 },
    title: { color: AMBER, fontSize: 15, fontWeight: '600' },
    subtitle: { color: theme.colors.text.secondary, fontSize: 12, marginTop: 2 },
    badge: {
      backgroundColor: theme.colors.status.delayed,
      borderRadius: theme.radius.sm + 4,
      minWidth: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    badgeText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
    chevron: { color: theme.colors.text.muted, fontSize: 18 },
  })
}
