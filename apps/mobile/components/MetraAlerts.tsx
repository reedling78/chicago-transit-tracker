import { useMemo, useState } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native'
import { useAlerts } from '../lib/hooks'
import { LINE_COLORS, METRA_LINE_NAMES } from '@ctt/shared'
import { useTheme } from '../lib/theme'
import type { Theme } from '../lib/theme'
import AlertCard from './AlertCard'

export default function MetraAlerts({ routeId }: { routeId?: string }) {
  const { alerts, loading, error, retry } = useAlerts('metra', routeId)
  const [selectedLine, setSelectedLine] = useState<string>('all')
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])

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
            const bg = colors?.bg ?? theme.colors.text.muted
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
                  style={[
                    styles.chipText,
                    { color: isSelected ? (colors?.text ?? theme.colors.text.onScrim) : bg },
                  ]}
                >
                  {METRA_LINE_NAMES[id] ?? id}
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
