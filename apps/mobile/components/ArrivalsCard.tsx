import { useMemo, useState, useEffect } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import {
  computeArrivalGroups,
  formatMinutesAway as sharedFormatMinutesAway,
  indexMetraTripUpdates,
  LINE_COLORS,
} from '@ctt/shared'
import type { StationSchedule, StationTrips } from '@ctt/shared'
import { useTheme } from '../lib/theme'
import type { Theme } from '../lib/theme'
import { useMetraFeed } from '../lib/useMetraFeed'

interface ArrivalsCardProps {
  schedule: StationSchedule | null
  service: 'cta' | 'metra'
  loading?: boolean
  trips?: StationTrips | null
  /** Station GTFS `stop_id` — enables the Metra realtime merge when present. */
  metraStopId?: string | null
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  const period = h < 12 ? 'AM' : 'PM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

function formatLastUpdated(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export const formatMinutesAway = sharedFormatMinutesAway

function SkeletonRow({ color, styles }: { color: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={[styles.row, { backgroundColor: color }]}>
      <View>
        <View style={styles.skeletonLine} />
        <View style={styles.skeletonHeadsign} />
      </View>
      <View style={styles.skeletonMinutes} />
    </View>
  )
}

export function ArrivalsCard({
  schedule,
  service,
  loading,
  trips,
  metraStopId,
}: ArrivalsCardProps) {
  const router = useRouter()
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
  const [tick, setTick] = useState(0)
  const isMetra = service === 'metra'

  const realtimeEnabled = isMetra && !!metraStopId
  const { data: feedData, fetchedAt } = useMetraFeed('tripupdates', { enabled: realtimeEnabled })

  // Refresh countdowns every 60s without re-fetching the schedule.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const realtime = useMemo(
    () => (realtimeEnabled ? indexMetraTripUpdates(feedData) : null),
    [realtimeEnabled, feedData],
  )

  const groups = useMemo(() => {
    if (!schedule) return []
    return computeArrivalGroups({
      schedule,
      trips,
      now: new Date(),
      service,
      realtime,
      metraStopId,
    })
    // `tick` drives the 60s countdown refresh; realtime/fetchedAt drive live updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, trips, service, realtime, metraStopId, fetchedAt, tick])

  const skeletonColor = theme.colors.accent.primary
  const serviceLabel = isMetra ? 'Metra' : 'CTA'
  const hasLiveRow = groups.some((g) => g.items.some((it) => it.isLive || it.isCancelled))

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="train-outline" size={16} color={theme.colors.text.primary} />
        <Text style={styles.headerText}>
          Scheduled arrivals — estimates based on{' '}
          <Text style={styles.headerBold}>{serviceLabel} timetable</Text>
        </Text>
        {hasLiveRow && (
          <View style={styles.liveBadge}>
            <View style={styles.liveBadgeDot} />
            <Text style={styles.liveBadgeText}>Live</Text>
          </View>
        )}
      </View>

      {hasLiveRow && fetchedAt != null && (
        <View style={styles.lastUpdatedBar}>
          <Text style={styles.lastUpdatedText}>Last updated: {formatLastUpdated(fetchedAt)}</Text>
        </View>
      )}

      {/* Loading skeleton */}
      {loading && !schedule && (
        <View>
          <View style={styles.directionHeader}>
            <View style={styles.skeletonDirectionLabel} />
          </View>
          <SkeletonRow color={skeletonColor} styles={styles} />
          <SkeletonRow color={skeletonColor} styles={styles} />
          <View style={[styles.directionHeader, { marginTop: 1 }]}>
            <View style={styles.skeletonDirectionLabel} />
          </View>
          <SkeletonRow color={skeletonColor} styles={styles} />
          <SkeletonRow color={skeletonColor} styles={styles} />
        </View>
      )}

      {/* Empty state */}
      {!loading && schedule && groups.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No upcoming departures found.</Text>
        </View>
      )}

      {/* No schedule */}
      {!loading && !schedule && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Schedule data unavailable for this station.</Text>
        </View>
      )}

      {/* Grouped arrivals */}
      {groups.map((group) => {
        const colors = LINE_COLORS[group.line]
        const bg = colors?.bg ?? theme.colors.text.muted

        return (
          <View key={group.headsign}>
            <View style={styles.directionHeader}>
              <Text style={styles.directionText}>Service toward {group.headsign}</Text>
            </View>

            {group.items.map((arrival, i) => {
              const rowContent = (
                <>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowSubtitle}>
                      {group.line} Line · {formatTime(arrival.departureMinutes)} to
                    </Text>
                    <Text style={styles.rowHeadsign}>{group.headsign}</Text>
                  </View>
                  <View style={styles.rowRight}>
                    {arrival.isCancelled ? (
                      <Text style={styles.cancelledPill}>Cancelled</Text>
                    ) : (
                      <>
                        <Text style={styles.rowMinutes}>
                          {formatMinutesAway(arrival.minutesAway)}
                        </Text>
                        {arrival.isLive ? (
                          <View
                            style={styles.liveDot}
                            accessibilityLabel="Live — based on Metra realtime data"
                          />
                        ) : (
                          <Text style={styles.rowApprox}>≈</Text>
                        )}
                      </>
                    )}
                  </View>
                </>
              )

              if (arrival.tripId && arrival.lineSlug) {
                const href = `/metra/${arrival.lineSlug}/train/${arrival.tripId}` as const
                return (
                  <Pressable
                    key={i}
                    onPress={() => router.push(href)}
                    style={({ pressed }) => [
                      styles.row,
                      { backgroundColor: bg },
                      pressed && styles.rowPressed,
                    ]}
                    accessibilityRole="link"
                    accessibilityLabel={`Train to ${group.headsign} in ${formatMinutesAway(arrival.minutesAway)}`}
                    testID={`arrival-row:${href}`}
                  >
                    {rowContent}
                  </Pressable>
                )
              }

              return (
                <View key={i} style={[styles.row, { backgroundColor: bg }]}>
                  {rowContent}
                </View>
              )
            })}
          </View>
        )
      })}
    </View>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      borderRadius: theme.radius.md,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[2],
      backgroundColor: theme.colors.bg.surface,
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[2] + 2,
    },
    headerText: { fontSize: 13, color: theme.colors.text.primary, flex: 1 },
    headerBold: { fontWeight: '700' },
    directionHeader: {
      backgroundColor: theme.colors.border.subtle,
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[2],
    },
    directionText: { fontSize: 13, fontWeight: '600', color: theme.colors.text.primary },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[3],
      borderTopWidth: StyleSheet.hairlineWidth,
      // Hairline divider on a saturated line color — kept literal for contrast.
      borderTopColor: 'rgba(0,0,0,0.1)',
      minHeight: 44,
    },
    rowPressed: { opacity: 0.85 },
    rowLeft: { flex: 1 },
    // Text on saturated line-color rows — always near-white regardless of mode.
    rowSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
    rowHeadsign: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.text.onScrim,
      marginTop: 1,
    },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    rowMinutes: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.text.onScrim,
      fontVariant: ['tabular-nums'],
    },
    rowApprox: { fontSize: 17, color: 'rgba(255,255,255,0.6)' },
    liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#ffffff' },
    cancelledPill: {
      color: '#fecaca',
      backgroundColor: 'rgba(239,68,68,0.2)',
      fontSize: 14,
      fontWeight: '700',
      borderRadius: 4,
      paddingHorizontal: 8,
      paddingVertical: 2,
      overflow: 'hidden',
    },
    liveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(34,197,94,0.2)',
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    liveBadgeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.status.onTime,
    },
    liveBadgeText: { fontSize: 11, fontWeight: '700', color: theme.colors.status.onTime },
    lastUpdatedBar: {
      backgroundColor: theme.colors.bg.surface,
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[1] + 2,
    },
    lastUpdatedText: { fontSize: 11, color: theme.colors.text.secondary },
    emptyContainer: {
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[6],
      alignItems: 'center',
    },
    emptyText: { fontSize: 13, color: theme.colors.text.secondary },
    skeletonLine: {
      width: 112,
      height: 12,
      borderRadius: 4,
      backgroundColor: 'rgba(255,255,255,0.3)',
      marginBottom: 6,
    },
    skeletonHeadsign: {
      width: 80,
      height: 18,
      borderRadius: 4,
      backgroundColor: 'rgba(255,255,255,0.3)',
    },
    skeletonMinutes: {
      width: 56,
      height: 26,
      borderRadius: 4,
      backgroundColor: 'rgba(255,255,255,0.3)',
    },
    skeletonDirectionLabel: {
      width: 160,
      height: 14,
      borderRadius: 4,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
  })
}
