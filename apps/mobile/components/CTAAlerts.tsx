import { useMemo, useState } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native'
import { useAlerts } from '../lib/hooks'
import { CTA_ROUTE_ID_TO_NAME } from '@ctt/shared'
import { useTheme } from '../lib/theme'
import type { Theme } from '../lib/theme'
import AlertCard from './AlertCard'

export default function CTAAlerts({ routeId }: { routeId?: string }) {
  const { alerts, loading, error, retry } = useAlerts('cta', routeId)
  const [selectedRoute, setSelectedRoute] = useState<string>('all')
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])

  const activeRoutes = useMemo(() => {
    const map = new Map<string, { color: string; textColor: string }>()
    for (const alert of alerts) {
      for (const route of alert.routes) {
        if (!map.has(route.routeId)) {
          map.set(route.routeId, { color: route.color, textColor: route.textColor })
        }
      }
    }
    return map
  }, [alerts])

  const filteredAlerts =
    selectedRoute === 'all'
      ? alerts
      : alerts.filter((a) => a.routes.some((r) => r.routeId === selectedRoute))

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.accent.primary} />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load alerts: {error}</Text>
        <Pressable style={styles.retryButton} onPress={retry}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{filteredAlerts.length} Service Alerts</Text>

      {activeRoutes.size > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <Pressable
            style={[styles.chip, selectedRoute === 'all' && styles.chipSelected]}
            onPress={() => setSelectedRoute('all')}
          >
            <Text style={[styles.chipText, selectedRoute === 'all' && styles.chipTextSelected]}>
              All
            </Text>
          </Pressable>
          {Array.from(activeRoutes.entries()).map(([id, colors]) => {
            const isSelected = selectedRoute === id
            return (
              <Pressable
                key={id}
                style={[
                  styles.chip,
                  isSelected
                    ? { backgroundColor: colors.color }
                    : {
                        backgroundColor: colors.color + '1A',
                        borderColor: colors.color + '40',
                        borderWidth: 1,
                      },
                ]}
                onPress={() => setSelectedRoute(id)}
              >
                <Text
                  style={[styles.chipText, { color: isSelected ? colors.textColor : colors.color }]}
                >
                  {CTA_ROUTE_ID_TO_NAME[id] ?? id}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      )}

      {filteredAlerts.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✓</Text>
          <Text style={styles.emptyText}>No active service alerts</Text>
        </View>
      )}

      {filteredAlerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} />
      ))}
    </View>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { gap: theme.space[3] },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      color: theme.colors.text.muted,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    chips: { flexDirection: 'row', gap: theme.space[2], paddingVertical: theme.space[1] },
    chip: { borderRadius: theme.radius.lg, paddingHorizontal: theme.space[3], paddingVertical: 6 },
    chipSelected: { backgroundColor: theme.colors.text.primary },
    chipText: { fontSize: 12, fontWeight: '600', color: theme.colors.text.secondary },
    chipTextSelected: { color: theme.colors.text.inverse },
    errorContainer: {
      backgroundColor: '#7f1d1d20',
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: '#7f1d1d40',
      padding: theme.space[5],
      gap: theme.space[3],
      alignItems: 'flex-start',
    },
    errorText: { color: '#fca5a5', fontSize: 13, fontWeight: '500' },
    retryButton: {
      backgroundColor: theme.colors.status.delayed,
      borderRadius: theme.radius.sm + 2,
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[2],
    },
    retryText: { color: '#ffffff', fontSize: 13, fontWeight: '500' },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.bg.elevated,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
      paddingVertical: 40,
      gap: theme.space[2],
    },
    emptyIcon: { color: theme.colors.status.onTime, fontSize: 28 },
    emptyText: { color: theme.colors.text.muted, fontSize: 13 },
  })
}
