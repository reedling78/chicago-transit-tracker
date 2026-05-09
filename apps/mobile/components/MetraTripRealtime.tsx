import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import {
  computeHeroStatus,
  deriveStopState,
  filterFeedForTrip,
  formatClockTime,
  isTripCompleted,
  isTripScheduledEndPast,
  LINE_COLORS,
  minutesSinceMidnight,
  type RealtimeState,
  type TripStop,
} from '@ctt/shared'
import { useMetraFeed } from '../lib/useMetraFeed'
import { useTheme } from '../lib/theme'
import type { Theme } from '../lib/theme'
import MetraTripHeroStatusCard from './MetraTripHeroStatusCard'
import MetraTripStopTimeline from './MetraTripStopTimeline'

export interface TripDetail {
  tripId: string
  trainNumber: string
  headsign: string
  line: string
  lineSlug: string
  lineName: string
  serviceType: 'weekday' | 'saturday' | 'sunday'
  directionId: number
  stops: TripStop[]
}

const POLL_INTERVAL_MS = 30_000
const MAX_POLLING_DURATION_MS = 4 * 60 * 60 * 1000
const COMPLETION_EMPTY_THRESHOLD = 2

export default function MetraTripRealtime({
  trip,
  lineSlug,
}: {
  trip: TripDetail
  lineSlug: string
}) {
  const [realtime, setRealtime] = useState<RealtimeState | null>(null)
  const [stopped, setStopped] = useState(false)
  const [nowMs, setNowMs] = useState<number>(() => Date.now())

  const mountTimeRef = useRef<number | null>(null)
  const emptyCountRef = useRef<number>(0)
  const lastProcessedFetchRef = useRef<number | null>(null)

  const tripUpdatesFeed = useMetraFeed('tripupdates', {
    intervalMs: POLL_INTERVAL_MS,
    enabled: !stopped,
  })
  const positionsFeed = useMetraFeed('positions', {
    intervalMs: POLL_INTERVAL_MS,
    enabled: !stopped,
  })

  const error = tripUpdatesFeed.error ?? positionsFeed.error

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  // Enforce max polling duration: after the threshold, stop consuming
  // realtime feeds regardless of state. Time-driven one-shot handoff.
  useEffect(() => {
    if (mountTimeRef.current == null) mountTimeRef.current = Date.now()
    const mountedAt = mountTimeRef.current
    const remaining = MAX_POLLING_DURATION_MS - (Date.now() - mountedAt)
    if (remaining <= 0) {
      setStopped(true)
      setRealtime((prev) => (prev ? { ...prev, stopped: true } : prev))
      return
    }
    const id = setTimeout(() => {
      setStopped(true)
      setRealtime((prev) => (prev ? { ...prev, stopped: true } : prev))
    }, remaining)
    return () => clearTimeout(id)
  }, [])

  // React to new fetches from the shared hook: filter to this trip,
  // update the derived realtime state, and decide whether we should stop
  // polling because the train has completed its run. lastProcessedFetchRef
  // guarantees one state update per distinct fetch event.
  useEffect(() => {
    const latestFetchedAt = Math.max(tripUpdatesFeed.fetchedAt ?? 0, positionsFeed.fetchedAt ?? 0)
    if (latestFetchedAt === 0) return
    if (lastProcessedFetchRef.current === latestFetchedAt) return
    lastProcessedFetchRef.current = latestFetchedAt

    const tu = filterFeedForTrip(tripUpdatesFeed.data, lineSlug, trip.trainNumber)
    const vp = filterFeedForTrip(positionsFeed.data, lineSlug, trip.trainNumber)
    const tripUpdate = tu.tripUpdate
    const vehiclePosition = vp.vehiclePosition

    const hasAny = Boolean(tripUpdate || vehiclePosition)
    if (hasAny) {
      emptyCountRef.current = 0
    } else {
      emptyCountRef.current += 1
    }

    const nowMinutes = minutesSinceMidnight(new Date())
    const scheduledEndPast = isTripScheduledEndPast(trip.stops, nowMinutes)

    const isStopped = isTripCompleted({
      tripUpdate,
      vehiclePosition,
      emptyCount: emptyCountRef.current,
      emptyThreshold: COMPLETION_EMPTY_THRESHOLD,
      scheduledEndPast,
    })

    setRealtime({
      tripUpdate,
      vehiclePosition,
      fetchedAt: latestFetchedAt,
      stopped: isStopped,
    })
    if (isStopped) setStopped(true)
  }, [
    tripUpdatesFeed.fetchedAt,
    positionsFeed.fetchedAt,
    tripUpdatesFeed.data,
    positionsFeed.data,
    lineSlug,
    trip.trainNumber,
    trip.stops,
  ])

  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
  const derivation = useMemo(() => deriveStopState(trip.stops, realtime), [trip.stops, realtime])

  const { stops: derivedStops, tripDelayMinutes, phase } = derivation
  const lineColor = LINE_COLORS[trip.line]?.bg ?? theme.colors.text.muted

  const hasFetched = realtime !== null
  const isStopped = realtime?.stopped ?? false

  const heroStatus = hasFetched
    ? computeHeroStatus(phase, tripDelayMinutes, trip.stops[0], minutesSinceMidnight(new Date()))
    : null
  const currentDerived = derivedStops.find((d) => d.status === 'current')

  return (
    <View>
      {heroStatus && (
        <MetraTripHeroStatusCard
          status={heroStatus}
          phase={phase}
          currentDerived={currentDerived}
          firstStop={trip.stops[0]}
          lastStop={trip.stops[trip.stops.length - 1]}
          vehiclePosition={realtime?.vehiclePosition ?? null}
          lineColor={lineColor}
          error={error}
          nowMs={nowMs}
        />
      )}

      <MetraTripStopTimeline
        derivedStops={derivedStops}
        lineColor={lineColor}
        lineSlug={lineSlug}
      />

      {isStopped && realtime && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Last updated {formatClockTime(new Date(realtime.fetchedAt))}
          </Text>
          <Pressable
            testID="refresh"
            onPress={() => {
              emptyCountRef.current = 0
              lastProcessedFetchRef.current = null
              mountTimeRef.current = Date.now()
              setStopped(false)
              setRealtime((prev) => (prev ? { ...prev, stopped: false } : prev))
            }}
            style={({ pressed }) => [styles.refreshButton, pressed && styles.refreshButtonPressed]}
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[3],
    },
    footerText: { color: theme.colors.text.secondary, fontSize: 12 },
    refreshButton: {
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.space[3],
      paddingVertical: 6,
    },
    refreshButtonPressed: { backgroundColor: theme.colors.bg.surface },
    refreshButtonText: { color: theme.colors.text.secondary, fontSize: 12, fontWeight: '600' },
  })
}
