import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native'
import { useAlerts } from '../lib/hooks'
import { CTA_ROUTE_ID_TO_NAME } from '@ctt/shared'
import AlertCard from './AlertCard'
import { useMemo, useState } from 'react'

export default function CTAAlerts({ routeId }: { routeId?: string }) {
  const { alerts, loading, error, retry } = useAlerts('cta', routeId)
  const [selectedRoute, setSelectedRoute] = useState<string>('all')

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
        <ActivityIndicator size="large" color="#00a1de" />
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
      {/* Header */}
      <Text style={styles.header}>{filteredAlerts.length} Service Alerts</Text>

      {/* Filter chips */}
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

      {/* Empty state */}
      {filteredAlerts.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✓</Text>
          <Text style={styles.emptyText}>No active service alerts</Text>
        </View>
      )}

      {/* Alert cards */}
      {filteredAlerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipSelected: {
    backgroundColor: '#ffffff',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
  },
  chipTextSelected: {
    color: '#111827',
  },
  errorContainer: {
    backgroundColor: '#7f1d1d20',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7f1d1d40',
    padding: 20,
    gap: 12,
    alignItems: 'flex-start',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    paddingVertical: 40,
    gap: 8,
  },
  emptyIcon: {
    color: '#22c55e',
    fontSize: 28,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 13,
  },
})
