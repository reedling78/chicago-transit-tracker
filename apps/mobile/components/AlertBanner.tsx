import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Link } from 'expo-router'
import { useAlerts } from '../lib/hooks'

type AlertBannerProps = {
  service: 'cta' | 'metra'
  href: string
}

export default function AlertBanner({ service, href }: AlertBannerProps) {
  const { alerts, loading } = useAlerts(service)
  const count = alerts.length

  return (
    <Link href={href as never} asChild>
      <Pressable style={styles.card}>
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
      </Pressable>
    </Link>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
  title: {
    color: '#fbbf24',
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  chevron: {
    color: '#6b7280',
    fontSize: 18,
  },
})
