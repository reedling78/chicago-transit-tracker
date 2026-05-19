import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import {
  computeArrivalGroups,
  displayStationName,
  formatMinutesAway,
  indexMetraTripUpdates,
  LINE_COLORS,
  stationCardSubheader,
  summarizeCompact,
  type ArrivalGroup,
  type Favorite,
  type FavoriteDensity,
  type Line,
  type Station,
} from '@ctt/shared'
import { favoriteRoute } from '../../../lib/favoriteRoute'
import { useTheme } from '../../../lib/theme'
import type { Theme } from '../../../lib/theme'
import { useStationScheduleQuery, useStationTripsQuery } from '../../../lib/useDashboardQueries'
import { useMetraFeed } from '../../../lib/useMetraFeed'
import PressableButton from '../../PressableButton'
import CardMenuButton from './CardMenuButton'
import { useCardStyles } from './cardStyles'

interface StationCardProps {
  favorite: Favorite
  station: Station | undefined
  lines: Line[] | undefined
  onLongPress: () => void
  onMenuPress: () => void
  isActive?: boolean
}

function isMetraStation(station: Station | undefined): boolean {
  return station?.service === 'metra' || station?.service === 'both'
}

/** Pulsing dot in the card header — signals at least one row is on live data. */
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
      style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e', opacity }}
    />
  )
}

export default function StationCard({
  favorite,
  station,
  lines,
  onLongPress,
  onMenuPress,
  isActive,
}: StationCardProps) {
  const router = useRouter()
  const cardStyles = useCardStyles()
  const { theme } = useTheme()
  const localStyles = useMemo(() => makeLocalStyles(theme), [theme])
  const target = station ? favoriteRoute(favorite, lines, [station]) : null
  const title = displayStationName(station?.name) ?? favorite.id
  const metra = isMetraStation(station)
  const subtitle = station ? stationCardSubheader(metra ? 'metra' : 'cta', station.lines ?? []) : ''

  const slug = station?.slug ?? null
  const scheduleQuery = useStationScheduleQuery(slug)
  const tripsQuery = useStationTripsQuery(slug, metra)

  const metraStopId = station?.metraStopId ?? null
  const realtimeEnabled = metra && !!metraStopId
  const { data: feedData, fetchedAt } = useMetraFeed('tripupdates', { enabled: realtimeEnabled })

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const density: FavoriteDensity = favorite.density ?? 'expanded'
  const directionFilter = favorite.directionFilter ?? 'all'

  const realtime = realtimeEnabled ? indexMetraTripUpdates(feedData) : null

  const groups = computeArrivalGroups({
    schedule: scheduleQuery.data ?? null,
    trips: metra ? (tripsQuery.data ?? null) : null,
    now,
    service: metra ? 'metra' : 'cta',
    directionFilter,
    limit: density === 'compact' ? 2 : 3,
    realtime,
    metraStopId,
  })

  const hasLiveRow = groups.some((g) => g.items.some((it) => it.isLive || it.isCancelled))

  return (
    <PressableButton
      onPress={() => target && router.push(target as never)}
      onLongPress={onLongPress}
      delayLongPress={250}
      disabled={!target}
      accessibilityRole="link"
      accessibilityLabel={title}
      feedback="subtle"
      style={[cardStyles.row, localStyles.column, isActive && cardStyles.rowDragging]}
    >
      <View style={localStyles.headerRow}>
        <View style={cardStyles.content}>
          <Text style={cardStyles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={cardStyles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {hasLiveRow ? (
          <View style={localStyles.liveBadge}>
            <LiveDot />
            <Text style={localStyles.liveText}>Live</Text>
          </View>
        ) : null}
        <CardMenuButton onPress={onMenuPress} accessibilityLabel={`Open menu for ${title}`} />
      </View>

      {station ? (
        <View style={localStyles.body}>
          <ArrivalsBody
            density={density}
            groups={groups}
            loading={scheduleQuery.isLoading}
            hasSchedule={scheduleQuery.data !== null && scheduleQuery.data !== undefined}
            lastUpdated={hasLiveRow ? fetchedAt : null}
            onPressTrain={
              metra
                ? (lineSlug, trainNumber) =>
                    router.push(`/metra/${lineSlug}/train/${trainNumber}` as never)
                : undefined
            }
            styles={localStyles}
          />
        </View>
      ) : null}
    </PressableButton>
  )
}

interface ArrivalsBodyProps {
  density: FavoriteDensity
  groups: ArrivalGroup[]
  loading: boolean
  hasSchedule: boolean
  lastUpdated: number | null
  /** Metra only — navigate to a train's detail screen. Undefined for CTA. */
  onPressTrain?: (lineSlug: string, trainNumber: string) => void
  styles: LocalStyles
}

/** First arrival in a group that carries train identity (Metra, matched). */
function firstTrainItem(g: ArrivalGroup) {
  return g.items.find((it) => it.lineSlug && it.trainNumber)
}

function formatLastUpdated(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function ArrivalsBody({
  density,
  groups,
  loading,
  hasSchedule,
  lastUpdated,
  onPressTrain,
  styles,
}: ArrivalsBodyProps) {
  if (loading) {
    return (
      <View testID="arrivals-skeleton" style={styles.skeletonStack}>
        <View style={styles.skeletonShort} />
        <View style={styles.skeletonLong} />
      </View>
    )
  }

  if (!hasSchedule) {
    return <Text style={styles.emptyText}>Schedule data unavailable for this station.</Text>
  }

  if (groups.length === 0) {
    return <Text style={styles.emptyText}>No upcoming departures.</Text>
  }

  // Metra GTFS-RT license requires a visible last-updated timestamp wherever
  // realtime data is shown. The green "Live" badge moved to the card header;
  // this de-emphasized footnote keeps us compliant.
  const updatedFootnote =
    lastUpdated != null ? (
      <Text style={styles.updatedFootnote}>Updated {formatLastUpdated(lastUpdated)}</Text>
    ) : null

  if (density === 'compact') {
    return (
      <View>
        {groups.map((g) => {
          const allCancelled =
            g.items.some((it) => it.isCancelled) && !g.items.some((it) => !it.isCancelled)
          const train = firstTrainItem(g)
          const rowContent = (
            <View style={styles.compactRow} testID="arrival-row-compact">
              <View
                style={[styles.dot, { backgroundColor: LINE_COLORS[g.line]?.bg ?? '#565a5c' }]}
              />
              <Text style={styles.compactHeadsign} numberOfLines={1}>
                {g.headsign}
              </Text>
              <Text style={styles.compactDot}>·</Text>
              <Text style={styles.compactTimes}>
                {allCancelled ? 'Cancelled' : summarizeCompact(g, 2)}
              </Text>
            </View>
          )
          if (onPressTrain && train?.lineSlug && train.trainNumber) {
            return (
              <PressableButton
                key={g.headsign}
                onPress={() => onPressTrain(train.lineSlug!, train.trainNumber!)}
                accessibilityRole="link"
                accessibilityLabel={`Open train toward ${g.headsign}`}
                feedback="subtle"
              >
                {rowContent}
              </PressableButton>
            )
          }
          return <View key={g.headsign}>{rowContent}</View>
        })}
        {updatedFootnote}
      </View>
    )
  }

  return (
    <View style={styles.expandedWrap}>
      {groups.map((g) => {
        const bg = LINE_COLORS[g.line]?.bg ?? '#565a5c'
        return (
          <View key={g.headsign} testID="arrival-group">
            <View style={styles.groupHeader}>
              <Text style={styles.groupHeaderText}>Service toward {g.headsign}</Text>
            </View>
            {g.items.map((item, i) => {
              const rowContent = (
                <>
                  <View style={styles.expandedRowLeft}>
                    <Text style={styles.expandedRowSubtitle} numberOfLines={1}>
                      {g.line} Line · {item.label} to
                    </Text>
                    <Text style={styles.expandedRowHeadsign} numberOfLines={1}>
                      {g.headsign}
                    </Text>
                  </View>
                  <View style={styles.expandedRowRight}>
                    {item.isCancelled ? (
                      <Text style={styles.cancelledPill}>Cancelled</Text>
                    ) : (
                      <>
                        <Text style={styles.expandedRowMinutes}>
                          {formatMinutesAway(item.minutesAway)}
                        </Text>
                        {item.isLive ? (
                          <View
                            style={styles.liveDot}
                            accessibilityLabel="Live — based on Metra realtime data"
                          />
                        ) : (
                          <Text style={styles.expandedRowApprox}>≈</Text>
                        )}
                      </>
                    )}
                  </View>
                </>
              )
              if (onPressTrain && item.lineSlug && item.trainNumber) {
                return (
                  <PressableButton
                    key={i}
                    onPress={() => onPressTrain(item.lineSlug!, item.trainNumber!)}
                    accessibilityRole="link"
                    accessibilityLabel={`Open train ${item.trainNumber} toward ${g.headsign}`}
                    feedback="subtle"
                    testID="arrival-row"
                    style={[styles.expandedRow, { backgroundColor: bg }]}
                  >
                    {rowContent}
                  </PressableButton>
                )
              }
              return (
                <View
                  key={i}
                  style={[styles.expandedRow, { backgroundColor: bg }]}
                  testID="arrival-row"
                >
                  {rowContent}
                </View>
              )
            })}
          </View>
        )
      })}
      {updatedFootnote}
    </View>
  )
}

type LocalStyles = ReturnType<typeof makeLocalStyles>

function makeLocalStyles(theme: Theme) {
  // Lifts white text off the saturated line-color row so it stays legible on
  // light brand colors (e.g. Metra orange / UP yellow-ish). Mirrors the
  // train-detail compact status card.
  const onColor = {
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  } as const
  return StyleSheet.create({
    column: { flexDirection: 'column', alignItems: 'stretch', gap: 10 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space[3] },
    // Bleed the arrivals section to the outer card's edges. The cardStyles.row
    // padding is 14px horizontal / 12px bottom — negate them so the inner block
    // touches the card's rounded corners.
    body: { marginTop: 2, marginHorizontal: -14, marginBottom: -theme.space[3] },
    emptyText: { color: theme.colors.text.secondary, fontSize: 12, paddingHorizontal: 14 },
    expandedWrap: {
      overflow: 'hidden',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border.subtle,
      // Round only the bottom corners to match the outer card's bottom radius.
      borderBottomLeftRadius: theme.radius.sm + 2,
      borderBottomRightRadius: theme.radius.sm + 2,
    },
    groupHeader: {
      backgroundColor: theme.colors.border.subtle,
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[2],
    },
    groupHeaderText: {
      color: theme.colors.text.primary,
      fontSize: 13,
      fontWeight: '600',
    },
    expandedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[3],
      borderTopWidth: StyleSheet.hairlineWidth,
      // Hairline divider sitting on a saturated line color — kept literal
      // because the line colors come from CTA branding constants and don't
      // theme-swap.
      borderTopColor: 'rgba(0,0,0,0.1)',
      minHeight: 44,
    },
    expandedRowLeft: { flex: 1 },
    // Text on saturated line-color rows — always near-white regardless of mode.
    expandedRowSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 11, ...onColor },
    expandedRowHeadsign: {
      color: theme.colors.text.onScrim,
      fontSize: 15,
      fontWeight: '700',
      marginTop: 1,
      ...onColor,
    },
    expandedRowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    expandedRowMinutes: {
      color: theme.colors.text.onScrim,
      fontWeight: '700',
      fontSize: 22,
      fontVariant: ['tabular-nums'],
      ...onColor,
    },
    expandedRowApprox: { color: 'rgba(255,255,255,0.6)', fontSize: 17, ...onColor },
    liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#ffffff' },
    cancelledPill: {
      color: '#fecaca',
      backgroundColor: 'rgba(239,68,68,0.2)',
      fontSize: 13,
      fontWeight: '700',
      borderRadius: 4,
      paddingHorizontal: 8,
      paddingVertical: 2,
      overflow: 'hidden',
      ...onColor,
    },
    liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    liveText: { color: '#22c55e', fontSize: 12, fontWeight: '700' },
    updatedFootnote: {
      color: theme.colors.text.secondary,
      fontSize: 11,
      paddingHorizontal: 14,
      paddingTop: 4,
      paddingBottom: 2,
    },
    compactRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
    compactHeadsign: { color: theme.colors.text.primary, fontSize: 15, fontWeight: '600' },
    compactDot: { color: theme.colors.text.secondary, fontSize: 15 },
    compactTimes: { color: theme.colors.text.secondary, fontSize: 15 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    skeletonStack: { gap: 6 },
    skeletonShort: {
      width: 120,
      height: 12,
      borderRadius: 4,
      backgroundColor: theme.colors.border.subtle,
    },
    skeletonLong: {
      width: 180,
      height: 12,
      borderRadius: 4,
      backgroundColor: theme.colors.border.subtle,
    },
  })
}
