import { useMemo } from 'react'
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native'
import type { NormalizedAlert } from '@ctt/shared'
import { useTheme } from '../lib/theme'
import type { Theme } from '../lib/theme'

export default function AlertCard({ alert }: { alert: NormalizedAlert }) {
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
  const borderColor = alert.routes[0]?.color ?? theme.colors.text.muted

  return (
    <View style={[styles.card, { borderLeftColor: borderColor }]}>
      {/* Route badges */}
      <View style={styles.badges}>
        {alert.routes.map((route) => (
          <View key={route.routeId} style={[styles.badge, { backgroundColor: route.color }]}>
            <Text style={[styles.badgeText, { color: route.textColor }]}>{route.routeName}</Text>
          </View>
        ))}
      </View>

      {/* Headline */}
      {alert.headline ? <Text style={styles.headline}>{alert.headline}</Text> : null}

      {/* Description */}
      {alert.description ? <Text style={styles.description}>{alert.description}</Text> : null}

      {/* Link */}
      {alert.url ? (
        <Pressable onPress={() => Linking.openURL(alert.url!)}>
          <Text style={styles.link}>More info →</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.bg.elevated,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
      borderLeftWidth: 4,
      padding: theme.space[4],
      gap: theme.space[2],
    },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    badge: { borderRadius: theme.radius.md, paddingHorizontal: 10, paddingVertical: 3 },
    badgeText: { fontSize: 12, fontWeight: '600' },
    headline: { color: theme.colors.text.primary, fontSize: 15, fontWeight: '600' },
    description: { color: theme.colors.text.secondary, fontSize: 13, lineHeight: 20 },
    link: { color: theme.colors.accent.primary, fontSize: 13, fontWeight: '500' },
  })
}
