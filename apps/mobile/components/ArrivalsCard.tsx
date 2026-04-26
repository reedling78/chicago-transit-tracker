import { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { LINE_COLORS } from '@ctt/shared'
import type { StationSchedule, StationTrips } from '@ctt/shared'

interface Arrival {
  headsign: string
  line: string
  departureMinutes: number
  minutesAway: number
  tripId?: string
  lineSlug?: string
}

interface ArrivalsCardProps {
  schedule: StationSchedule | null
  service: 'cta' | 'metra'
  loading?: boolean
  trips?: StationTrips | null
}

function getCurrentDayType(): 'weekday' | 'saturday' | 'sunday' {
  const day = new Date().getDay()
  if (day === 0) return 'sunday'
  if (day === 6) return 'saturday'
  return 'weekday'
}

function getCurrentMinutes(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  const period = h < 12 ? 'AM' : 'PM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

export function formatMinutesAway(minutesAway: number): string {
  if (minutesAway < 1) return 'Due'
  if (minutesAway < 60) return `${minutesAway} min`
  const hours = Math.floor(minutesAway / 60)
  const mins = minutesAway % 60
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`
}

function computeArrivals(
  schedule: StationSchedule,
  trips: StationTrips | null | undefined,
): Arrival[] {
  const dayType = getCurrentDayType()
  const nowMinutes = getCurrentMinutes()
  const arrivals: Arrival[] = []

  const tripLookup = new Map<string, { tripId: string; lineSlug: string }>()
  if (trips) {
    for (const entry of trips[dayType]) {
      const key = `${entry.headsign}|${entry.line}|${entry.departure}`
      tripLookup.set(key, { tripId: entry.tripId, lineSlug: entry.lineSlug })
    }
  }

  for (const dir of schedule.directions) {
    const times = dir[dayType]
    const upcoming = times.filter((t) => t > nowMinutes).slice(0, 3)

    for (const t of upcoming) {
      const key = `${dir.headsign}|${dir.line}|${formatTime(t)}`
      const match = tripLookup.get(key)
      arrivals.push({
        headsign: dir.headsign,
        line: dir.line,
        departureMinutes: t,
        minutesAway: t - nowMinutes,
        tripId: match?.tripId,
        lineSlug: match?.lineSlug,
      })
    }
  }

  arrivals.sort((a, b) => {
    if (a.headsign !== b.headsign) return a.headsign.localeCompare(b.headsign)
    return a.minutesAway - b.minutesAway
  })

  return arrivals
}

function SkeletonRow({ color }: { color: string }) {
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

export function ArrivalsCard({ schedule, service, loading, trips }: ArrivalsCardProps) {
  const router = useRouter()
  const [arrivals, setArrivals] = useState<Arrival[]>([])
  const scheduleRef = useRef<StationSchedule | null>(null)
  const tripsRef = useRef<StationTrips | null | undefined>(trips)

  useEffect(() => {
    tripsRef.current = trips
  }, [trips])

  useEffect(() => {
    if (schedule) {
      scheduleRef.current = schedule
      setArrivals(computeArrivals(schedule, tripsRef.current))
    }
  }, [schedule, trips])

  useEffect(() => {
    const id = setInterval(() => {
      if (scheduleRef.current) {
        setArrivals(computeArrivals(scheduleRef.current, tripsRef.current))
      }
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  // Group arrivals by headsign
  const grouped: { headsign: string; line: string; rows: Arrival[] }[] = []
  for (const arrival of arrivals) {
    const last = grouped[grouped.length - 1]
    if (last && last.headsign === arrival.headsign) {
      last.rows.push(arrival)
    } else {
      grouped.push({ headsign: arrival.headsign, line: arrival.line, rows: [arrival] })
    }
  }

  const skeletonColor = '#00a1de'
  const serviceLabel = service === 'cta' ? 'CTA' : 'Metra'

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="train-outline" size={16} color="#fff" />
        <Text style={styles.headerText}>
          Scheduled arrivals — estimates based on{' '}
          <Text style={styles.headerBold}>{serviceLabel} timetable</Text>
        </Text>
      </View>

      {/* Loading skeleton */}
      {loading && !schedule && (
        <View>
          <View style={styles.directionHeader}>
            <View style={styles.skeletonDirectionLabel} />
          </View>
          <SkeletonRow color={skeletonColor} />
          <SkeletonRow color={skeletonColor} />
          <View style={[styles.directionHeader, { marginTop: 1 }]}>
            <View style={styles.skeletonDirectionLabel} />
          </View>
          <SkeletonRow color={skeletonColor} />
          <SkeletonRow color={skeletonColor} />
        </View>
      )}

      {/* Empty state */}
      {!loading && schedule && arrivals.length === 0 && (
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
      {grouped.map((group) => {
        const colors = LINE_COLORS[group.line]
        const bg = colors?.bg ?? '#565a5c'

        return (
          <View key={group.headsign}>
            <View style={styles.directionHeader}>
              <Text style={styles.directionText}>Service toward {group.headsign}</Text>
            </View>

            {group.rows.map((arrival, i) => {
              const rowContent = (
                <>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowSubtitle}>
                      {arrival.line} Line · {formatTime(arrival.departureMinutes)} to
                    </Text>
                    <Text style={styles.rowHeadsign}>{arrival.headsign}</Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={styles.rowMinutes}>{formatMinutesAway(arrival.minutesAway)}</Text>
                    <Text style={styles.rowApprox}>≈</Text>
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
                    accessibilityLabel={`Train to ${arrival.headsign} in ${formatMinutesAway(arrival.minutesAway)}`}
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

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#374151',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerText: {
    fontSize: 13,
    color: '#fff',
    flex: 1,
  },
  headerBold: {
    fontWeight: '700',
  },
  directionHeader: {
    backgroundColor: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  directionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
    minHeight: 44,
  },
  rowPressed: {
    opacity: 0.85,
  },
  rowLeft: {
    flex: 1,
  },
  rowSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  rowHeadsign: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginTop: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowMinutes: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  rowApprox: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.6)',
  },
  emptyContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  // Skeleton styles
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
