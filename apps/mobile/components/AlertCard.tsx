import { View, Text, Pressable, StyleSheet, Linking } from 'react-native'
import type { NormalizedAlert } from '@ctt/shared'

export default function AlertCard({ alert }: { alert: NormalizedAlert }) {
  const borderColor = alert.routes[0]?.color ?? '#6b7280'

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

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    borderLeftWidth: 4,
    padding: 16,
    gap: 8,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headline: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  description: {
    color: '#9ca3af',
    fontSize: 13,
    lineHeight: 20,
  },
  link: {
    color: '#60a5fa',
    fontSize: 13,
    fontWeight: '500',
  },
})
