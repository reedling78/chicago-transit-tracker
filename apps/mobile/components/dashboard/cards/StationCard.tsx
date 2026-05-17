import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import {
  computeArrivalGroups,
  formatMinutesAway,
  LINE_COLORS,
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
  const title = station?.name ?? favorite.id
  const subtitle = station?.lines?.join(' • ') ?? ''
  const metra = isMetraStation(station)
  const meta = metra ? 'Metra' : 'CTA'

  const slug = station?.slug ?? null
  const scheduleQuery = useStationScheduleQuery(slug)
  const tripsQuery = useStationTripsQuery(slug, metra)

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const density: FavoriteDensity = favorite.density ?? 'expanded'
  const directionFilter = favorite.directionFilter ?? 'all'

  const groups = computeArrivalGroups({
    schedule: scheduleQuery.data ?? null,
    trips: metra ? (tripsQuery.data ?? null) : null,
    now,
    service: metra ? 'metra' : 'cta',
    directionFilter,
    limit: density === 'compact' ? 2 : 3,
  })

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
        {station ? <Text style={cardStyles.meta}>{meta}</Text> : null}
        <CardMenuButton onPress={onMenuPress} accessibilityLabel={`Open menu for ${title}`} />
      </View>

      {station ? (
        <View style={localStyles.body}>
          <ArrivalsBody
            density={density}
            groups={groups}
            loading={scheduleQuery.isLoading}
            hasSchedule={scheduleQuery.data !== null && scheduleQuery.data !== undefined}
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
  styles: LocalStyles
}

function ArrivalsBody({ density, groups, loading, hasSchedule, styles }: ArrivalsBodyProps) {
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

  if (density === 'compact') {
    return (
      <View>
        {groups.map((g) => (
          <View key={g.headsign} style={styles.compactRow} testID="arrival-row-compact">
            <View style={[styles.dot, { backgroundColor: LINE_COLORS[g.line]?.bg ?? '#565a5c' }]} />
            <Text style={styles.compactHeadsign} numberOfLines={1}>
              {g.headsign}
            </Text>
            <Text style={styles.compactDot}>·</Text>
            <Text style={styles.compactTimes}>{summarizeCompact(g, 2)}</Text>
          </View>
        ))}
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
            {g.items.map((item, i) => (
              <View
                key={i}
                style={[styles.expandedRow, { backgroundColor: bg }]}
                testID="arrival-row"
              >
                <View style={styles.expandedRowLeft}>
                  <Text style={styles.expandedRowSubtitle} numberOfLines={1}>
                    {g.line} Line · {item.label} to
                  </Text>
                  <Text style={styles.expandedRowHeadsign} numberOfLines={1}>
                    {g.headsign}
                  </Text>
                </View>
                <View style={styles.expandedRowRight}>
                  <Text style={styles.expandedRowMinutes}>
                    {formatMinutesAway(item.minutesAway)}
                  </Text>
                  <Text style={styles.expandedRowApprox}>≈</Text>
                </View>
              </View>
            ))}
          </View>
        )
      })}
    </View>
  )
}

type LocalStyles = ReturnType<typeof makeLocalStyles>

function makeLocalStyles(theme: Theme) {
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
    expandedRowSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
    expandedRowHeadsign: {
      color: theme.colors.text.onScrim,
      fontSize: 15,
      fontWeight: '700',
      marginTop: 1,
    },
    expandedRowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    expandedRowMinutes: {
      color: theme.colors.text.onScrim,
      fontWeight: '700',
      fontSize: 22,
      fontVariant: ['tabular-nums'],
    },
    expandedRowApprox: { color: 'rgba(255,255,255,0.6)', fontSize: 17 },
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
