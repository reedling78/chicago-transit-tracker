import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import {
  SERVICE_LABEL,
  type Favorite,
  type Line,
  type MetraTripDetail,
  type TripStop,
} from '@ctt/shared'
import { useFavoriteTripQuery } from '../../../lib/useDashboardQueries'
import { useMetraTripLiveStatus } from '../../../lib/useMetraTripLiveStatus'
import MetraTripHeroStatusCardCompact from '../../MetraTripHeroStatusCardCompact'
import CardMenuButton from './CardMenuButton'
import { cardStyles } from './cardStyles'

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

export default function TrainCard({
  favorite,
  lines,
  onLongPress,
  onMenuPress,
  isActive,
}: TrainCardProps) {
  const router = useRouter()
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
      ? `${originStop.stationName} to ${destStop.stationName}`
      : `Train ${trainNumber}`

  const pills: { label: string; tone?: 'line' }[] = []
  if (trip) {
    pills.push({ label: 'Metra' })
    if (trip.line) pills.push({ label: trip.line, tone: 'line' })
    if (trip.serviceType && trip.serviceType in SERVICE_LABEL) {
      pills.push({ label: SERVICE_LABEL[trip.serviceType as keyof typeof SERVICE_LABEL] })
    }
    if (trip.isExpress) pills.push({ label: 'Express' })
  }

  const accent = lineColor ? { ...cardStyles.accentBorder, borderLeftColor: lineColor } : null

  return (
    <Pressable
      onPress={() => router.push(`/metra/${lineSlug}/train/${trainNumber}` as never)}
      onLongPress={onLongPress}
      delayLongPress={250}
      accessibilityRole="link"
      accessibilityLabel={title}
      style={[cardStyles.row, styles.container, accent, isActive && cardStyles.rowDragging]}
    >
      <View style={styles.headerRow}>
        <Text style={[cardStyles.title, styles.titleFlex]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={cardStyles.meta}>#{trainNumber}</Text>
        <CardMenuButton onPress={onMenuPress} accessibilityLabel={`Open menu for ${title}`} />
      </View>
      {pills.length > 0 ? (
        <View style={cardStyles.pillRow}>
          {pills.map((pill, i) => {
            const overrideStyle =
              pill.tone === 'line' && lineColor ? { backgroundColor: lineColor } : null
            const textOverrideStyle =
              pill.tone === 'line'
                ? { color: line?.textColor ?? '#fff', fontWeight: '700' as const }
                : null
            return (
              <View key={`${pill.label}-${i}`} style={[cardStyles.pill, overrideStyle]}>
                <Text style={[cardStyles.pillText, textOverrideStyle]}>{pill.label}</Text>
              </View>
            )
          })}
        </View>
      ) : (
        <Text style={cardStyles.subtitle}>
          {trip?.headsign ? `To ${trip.headsign}` : 'Trip not currently scheduled'}
        </Text>
      )}
      {live && live.status && !live.isNoData && (
        <MetraTripHeroStatusCardCompact
          status={live.status}
          phase={live.phase}
          currentDerived={live.currentDerived}
          firstStop={live.firstStop}
          lastStop={live.lastStop}
          vehiclePosition={live.vehiclePosition}
          nowMs={live.nowMs}
        />
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleFlex: { flex: 1 },
})
