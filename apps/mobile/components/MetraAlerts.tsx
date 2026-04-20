import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native'
import { useAlerts } from '../lib/hooks'
import { LINE_COLORS, METRA_LINE_NAMES } from '@ctt/shared'
import AlertCard from './AlertCard'
import { useMemo, useState } from 'react'

export default function MetraAlerts({ routeId }: { routeId?: string }) {
  const { alerts, loading, error, retry } = useAlerts('metra', routeId)
  const [selectedLine, setSelectedLine] = useState<string>('all')

  const activeRoutes = useMemo(() => {
    const set = new Set<string>()
    for (const alert of alerts) {
      for (const route of alert.routes) {
        set.add(route.routeId)
      }
    }
    return Array.from(set).sort()
  }, [alerts])

  const filteredAlerts =
    selectedLine === 'all'
      ? alerts
      : alerts.filter((a) => a.routes.some((r) => r.routeId === selectedLine))

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1A3D7A" />
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
      {activeRoutes.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <Pressable
            style={[styles.chip, selectedLine === 'all' && styles.chipSelected]}
            onPress={() => setSelectedLine('all')}
          >
            <Text style={[styles.chipText, selectedLine === 'all' && styles.chipTextSelected]}>
              All
            </Text>
          </Pressable>
          {activeRoutes.map((id) => {
            const isSelected = selectedLine === id
            const colors = LINE_COLORS[id]
            const bg = colors?.bg ?? '#6b7280'
            return (
              <Pressable
                key={id}
                style={[
                  styles.chip,
                  isSelected
                    ? { backgroundColor: bg }
                    : { backgroundColor: bg + '1A', borderColor: bg + '40', borderWidth: 1 },
                ]}
                onPress={() => setSelectedLine(id)}
              >
                <Text
                  style={[styles.chipText, { color: isSelected ? (colors?.text ?? '#fff') : bg }]}
                >
                  {METRA_LINE_NAMES[id] ?? id}
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
