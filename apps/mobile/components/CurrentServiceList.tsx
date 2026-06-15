import { useEffect, useMemo, useRef } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { formatClockTime, type CurrentServiceTrain } from '@ctt/shared'
import { useTheme, tonePalette } from '../lib/theme'
import type { Theme } from '../lib/theme'
import PressableButton from './PressableButton'

export interface CurrentServiceListProps {
  trains: CurrentServiceTrain[]
  lineColor: string
  loading?: boolean
  error?: string | null
  emptyMessage?: string
  /** Epoch millis of the most recent realtime fetch — drives the "Updated H:MM" stamp. */
  fetchedAt?: number | null
}

function LiveDot() {
  const opacity = useRef(new Animated.Value(1)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])
  return (
    <Animated.View
      accessibilityRole="image"
      accessibilityLabel="Receiving live data"
      style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', opacity }}
    />
  )
}

export default function CurrentServiceList({
  trains,
  lineColor,
  loading = false,
  error = null,
  emptyMessage = 'No trains currently running.',
  fetchedAt = null,
}: CurrentServiceListProps) {
  const { theme } = useTheme()
  const router = useRouter()
  const styles = useMemo(() => makeStyles(theme), [theme])

  return (
    <View style={[styles.card, { borderLeftColor: lineColor }]} testID="current-service-list">
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Current service</Text>
        <View style={styles.liveWrap}>
          <LiveDot />
          <Text style={styles.liveText}>Live</Text>
          {/* Metra license: surface the time the data was last updated. */}
          {fetchedAt != null && (
            <Text style={styles.updatedText}>· Updated {formatClockTime(new Date(fetchedAt))}</Text>
          )}
        </View>
      </View>

      {error && <Text style={styles.errorText}>Live feed error: {error}</Text>}

      {loading && trains.length === 0 && (
        <View>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.row} accessibilityElementsHidden>
              <View style={[styles.skeleton, { width: 36 }]} />
              <View style={[styles.skeleton, styles.skeletonFlex]} />
              <View style={[styles.skeleton, { width: 64 }]} />
            </View>
          ))}
        </View>
      )}

      {!loading && trains.length === 0 && !error && (
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      )}

      {trains.length > 0 && (
        <View>
          {trains.map((train, idx) => {
            const tone = tonePalette(train.statusTone, theme)
            return (
              <PressableButton
                key={train.trainNumber}
                onPress={() => router.push(train.href as never)}
                feedback="subtle"
                testID={`current-service-row-${train.trainNumber}`}
                accessibilityRole="button"
                accessibilityLabel={`Train ${train.trainNumber} to ${train.destination}, ${train.statusLabel}`}
                style={[styles.row, idx > 0 && styles.rowDivider]}
              >
                <Text style={styles.trainNumber}>#{train.trainNumber}</Text>

                <View style={styles.rowMain}>
                  <Text style={styles.destination} numberOfLines={1}>
                    {train.destination}
                  </Text>
                  {train.nextStop && (
                    <Text style={styles.nextStop} numberOfLines={1}>
                      Next: {train.nextStop}
                      {train.nextStopEta ? ` · ${train.nextStopEta}` : ''}
                    </Text>
                  )}
                </View>

                <View style={[styles.pill, { backgroundColor: tone.dot + '22' }]}>
                  <View style={[styles.pillDot, { backgroundColor: tone.dot }]} />
                  <Text style={[styles.pillText, { color: tone.text }]} numberOfLines={1}>
                    {train.statusLabel}
                  </Text>
                </View>
              </PressableButton>
            )
          })}
        </View>
      )}
    </View>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      marginTop: theme.space[4],
      borderWidth: StyleSheet.hairlineWidth,
      borderLeftWidth: 4,
      borderColor: theme.colors.border.subtle,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.bg.elevated,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[3],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border.subtle,
    },
    headerLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: theme.colors.text.muted,
    },
    liveWrap: { flexDirection: 'row', alignItems: 'center', gap: theme.space[1] },
    liveText: { fontSize: 12, color: theme.colors.text.secondary },
    updatedText: { fontSize: 12, color: theme.colors.text.muted },
    errorText: {
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[3],
      fontSize: 12,
      color: theme.colors.status.delayed,
    },
    emptyText: {
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[4],
      fontSize: 14,
      color: theme.colors.text.secondary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[3],
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[3],
    },
    rowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border.subtle,
    },
    trainNumber: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.5,
      color: theme.colors.text.muted,
      minWidth: 40,
    },
    rowMain: { flex: 1, minWidth: 0 },
    destination: { fontSize: 14, fontWeight: '500', color: theme.colors.text.primary },
    nextStop: {
      marginTop: 2,
      fontSize: 12,
      color: theme.colors.text.secondary,
      fontVariant: ['tabular-nums'],
    },
    pill: {
      flexShrink: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: theme.radius.full,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    pillDot: { width: 6, height: 6, borderRadius: 3 },
    pillText: { fontSize: 12, fontWeight: '600' },
    skeleton: {
      height: 16,
      borderRadius: 4,
      backgroundColor: theme.colors.border.subtle,
    },
    skeletonFlex: { flex: 1 },
  })
}
