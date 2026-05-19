import { useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import {
  computeDestinationEta,
  computeRightPanel,
  formatClockLabel,
  formatMinutesAway,
  minutesUntil,
  nextServiceRunLabel,
  parseDisplayTimeToMinutes,
  shortenStationName,
  type Favorite,
  type Line,
  type MetraTripDetail,
  type TripStop,
} from '@ctt/shared'
import { useFavoriteTripQuery } from '../../../lib/useDashboardQueries'
import { useMetraTripLiveStatus } from '../../../lib/useMetraTripLiveStatus'
import MetraTripHeroStatusCardCompact from '../../MetraTripHeroStatusCardCompact'
import PressableButton from '../../PressableButton'
import CardMenuButton from './CardMenuButton'
import { useCardStyles } from './cardStyles'

interface TrainCardProps {
  favorite: Favorite
  lines: Line[] | undefined
  onLongPress: () => void
  onMenuPress: () => void
  isActive?: boolean
}

function pickStop(
  stops: TripStop[] | undefined,
  slug: string | undefined,
  fallback: TripStop | undefined,
): TripStop | undefined {
  if (!stops?.length) return fallback
  if (slug) {
    const match = stops.find((s) => s.slug === slug)
    if (match) return match
  }
  return fallback
}

/** Pulsing dot in the card header — signals the trip is on live data. */
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

export default function TrainCard({
  favorite,
  lines,
  onLongPress,
  onMenuPress,
  isActive,
}: TrainCardProps) {
  const router = useRouter()
  const cardStyles = useCardStyles()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  const { data: trip } = useFavoriteTripQuery(favorite.id) as { data: MetraTripDetail | null }
  const live = useMetraTripLiveStatus(trip ?? null)
  const [lineSlugFromId, trainNumberFromId] = favorite.id.split('_')
  const trainNumber = trip?.trainNumber ?? trainNumberFromId ?? favorite.id
  const line = lines?.find((l) => l.slug === (trip?.lineSlug ?? lineSlugFromId))
  const lineColor = line?.color
  const lineSlug = trip?.lineSlug ?? lineSlugFromId

  const firstStop = trip?.stops?.[0]
  const lastStop = trip?.stops?.[trip.stops.length - 1]
  const originStop = pickStop(trip?.stops, favorite.trainOriginStopSlug, firstStop)
  const destStop = pickStop(trip?.stops, favorite.trainDestinationStopSlug, lastStop)

  const title =
    trip && originStop && destStop
      ? `${shortenStationName(originStop.stationName)} to ${shortenStationName(destStop.stationName)}`
      : `Train ${trainNumber}`

  const subheader = trip ? `${trip.line ? `${trip.line} ` : ''}#${trainNumber}` : `#${trainNumber}`

  const liveShown = !!(live && live.status && !live.isNoData)
  const depMin = originStop ? parseDisplayTimeToMinutes(originStop.departure) : null
  const minsAway = depMin != null ? minutesUntil(now, depMin) : null
  const showCountdown = !liveShown && !!trip && depMin != null

  return (
    <PressableButton
      onPress={() => router.push(`/metra/${lineSlug}/train/${trainNumber}` as never)}
      onLongPress={onLongPress}
      delayLongPress={250}
      accessibilityRole="link"
      accessibilityLabel={title}
      feedback="subtle"
      style={[cardStyles.row, styles.container, isActive && cardStyles.rowDragging]}
    >
      <View style={styles.headerRow}>
        <View style={cardStyles.content}>
          <Text style={cardStyles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={cardStyles.subtitle} numberOfLines={1}>
            {subheader}
          </Text>
        </View>
        {liveShown && (
          <View style={styles.liveBadge}>
            <LiveDot />
            <Text style={styles.liveText}>Live</Text>
          </View>
        )}
        <CardMenuButton onPress={onMenuPress} accessibilityLabel={`Open menu for ${title}`} />
      </View>
      {liveShown && live && (
        <MetraTripHeroStatusCardCompact
          status={live.status!}
          vehiclePosition={live.vehiclePosition}
          nextStop={computeRightPanel(
            live.phase,
            live.currentDerived,
            live.firstStop,
            live.lastStop,
            live.nowMs,
          )}
          destination={computeDestinationEta(destStop, live.derivedStops, live.nowMs)}
          lineColor={lineColor}
          lineTextColor={line?.textColor}
        />
      )}
      {showCountdown && depMin != null && (
        <Text style={cardStyles.subtitle}>
          {minsAway != null && minsAway >= 0
            ? `Departs in ${formatMinutesAway(minsAway)} · ${formatClockLabel(depMin)}${
                originStop ? ` from ${originStop.stationName}` : ''
              }`
            : `Departed ${formatClockLabel(depMin)}${
                trip?.serviceType
                  ? ` · Next train ${nextServiceRunLabel(trip.serviceType, now)}`
                  : ''
              }`}
        </Text>
      )}
    </PressableButton>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveText: { color: '#22c55e', fontSize: 12, fontWeight: '700' },
})
