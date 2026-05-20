import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import type { DashboardItem, Line, MetraTripDetail, Station } from '@ctt/shared'
import { dashboardItemKey, shortenStationName } from '@ctt/shared'
import { useDashboardStore } from '../../lib/store/dashboard'
import {
  useDashboardItemTripQuery,
  useLinesQuery,
  useStationsQuery,
} from '../../lib/useDashboardQueries'
import { dashboardItemRoute } from '../../lib/dashboardItemRoute'
import { useTheme, type Theme } from '../../lib/theme'
import PressableButton from '../PressableButton'

type GroupKey = 'train' | 'station' | 'line'

const GROUP_TITLES: Record<GroupKey, string> = {
  train: 'Trains',
  station: 'Stations',
  line: 'Lines',
}

const GROUP_ORDER: GroupKey[] = ['train', 'station', 'line']

interface Props {
  /** Called after a successful navigation so the drawer can close itself. */
  onNavigate?: () => void
}

export default function DashboardItemsList({ onNavigate }: Props) {
  const items = useDashboardStore((s) => s.items)
  const { data: lines } = useLinesQuery()
  const { data: stations } = useStationsQuery()
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
  const router = useRouter()

  if (items.length === 0) {
    return (
      <Text style={styles.empty}>
        Tap &quot;+ Dashboard&quot; on any line, station, or train to add it here.
      </Text>
    )
  }

  const grouped: Record<GroupKey, DashboardItem[]> = { train: [], station: [], line: [] }
  for (const item of items) grouped[item.type].push(item)

  const navigate = (item: DashboardItem) => {
    const route = dashboardItemRoute(item, lines, stations)
    if (!route) return
    onNavigate?.()
    router.push(route)
  }

  return (
    <View style={styles.container}>
      {GROUP_ORDER.map((key) => {
        const groupItems = grouped[key]
        if (groupItems.length === 0) return null
        return (
          <View key={key} style={styles.group}>
            <Text style={styles.groupTitle} accessibilityRole="header">
              {GROUP_TITLES[key]}
            </Text>
            {groupItems.map((item) => {
              const RowComponent = item.type === 'train' ? TrainRow : NonTrainRow
              return (
                <RowComponent
                  key={dashboardItemKey(item.type, item.id)}
                  item={item}
                  lines={lines}
                  stations={stations}
                  onPress={() => navigate(item)}
                  theme={theme}
                  styles={styles}
                />
              )
            })}
          </View>
        )
      })}
    </View>
  )
}

interface RowProps {
  item: DashboardItem
  lines: Line[] | undefined
  stations: Station[] | undefined
  onPress: () => void
  theme: Theme
  styles: ReturnType<typeof makeStyles>
}

function NonTrainRow({ item, lines, stations, onPress, theme, styles }: RowProps) {
  const { title, subtitle } = describeNonTrain(item, lines, stations)
  return (
    <RowChrome title={title} subtitle={subtitle} onPress={onPress} theme={theme} styles={styles} />
  )
}

function TrainRow({ item, lines, onPress, theme, styles }: RowProps) {
  // Fetch the trip per row so the menu can show "{origin} to {destination}"
  // mirroring the dashboard TrainCard. Falls back to "Train {n}" until the
  // trip doc resolves.
  const { data: trip } = useDashboardItemTripQuery(item.id) as { data: MetraTripDetail | null }
  const { title, subtitle } = describeTrain(item, lines, trip)
  return (
    <RowChrome title={title} subtitle={subtitle} onPress={onPress} theme={theme} styles={styles} />
  )
}

function RowChrome({
  title,
  subtitle,
  onPress,
  theme,
  styles,
}: {
  title: string
  subtitle: string | null
  onPress: () => void
  theme: Theme
  styles: ReturnType<typeof makeStyles>
}) {
  return (
    <PressableButton
      onPress={onPress}
      feedback="subtle"
      accessibilityRole="button"
      accessibilityLabel={title}
      style={styles.row}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.text.secondary} />
    </PressableButton>
  )
}

function describeNonTrain(
  item: DashboardItem,
  lines: Line[] | undefined,
  stations: Station[] | undefined,
): { title: string; subtitle: string | null } {
  if (item.type === 'line') {
    const line = (lines ?? []).find((l) => l.slug === item.id)
    if (!line) return { title: item.id, subtitle: null }
    const subtitle = line.termini?.length ? line.termini.join(' — ') : null
    return { title: line.name, subtitle }
  }
  // station
  const station = (stations ?? []).find((s) => s.slug === item.id)
  if (!station) return { title: item.id, subtitle: null }
  const svc = station.service === 'metra' ? 'Metra' : 'CTA'
  return { title: station.name, subtitle: svc }
}

function describeTrain(
  item: DashboardItem,
  lines: Line[] | undefined,
  trip: MetraTripDetail | null,
): { title: string; subtitle: string | null } {
  const [lineSlugFromId, trainNumberFromId] = item.id.split('_')
  const trainNumber = trip?.trainNumber ?? trainNumberFromId ?? item.id
  const firstStop = trip?.stops?.[0]
  const lastStop = trip?.stops?.[trip.stops.length - 1]
  // Honor user-set origin/destination overrides (see Favorite settings in the
  // dashboard's train menu) so the menu label matches what the user picked.
  const originStop = trip?.stops?.find((s) => s.slug === item.trainOriginStopSlug) ?? firstStop
  const destStop = trip?.stops?.find((s) => s.slug === item.trainDestinationStopSlug) ?? lastStop
  const title =
    trip && originStop && destStop
      ? `${shortenStationName(originStop.stationName)} to ${shortenStationName(destStop.stationName)}`
      : `Train ${trainNumber}`
  const line = lines?.find((l) => l.slug === (trip?.lineSlug ?? lineSlugFromId))
  const lineLabel = trip?.line ?? line?.shortName ?? ''
  const subtitle = `${lineLabel ? `${lineLabel} ` : ''}#${trainNumber}`
  return { title, subtitle }
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { gap: theme.space[4] },
    empty: {
      color: theme.colors.text.secondary,
      fontSize: 13,
    },
    group: { gap: theme.space[1] },
    groupTitle: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      color: theme.colors.text.secondary,
      marginBottom: theme.space[1],
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[3],
      paddingVertical: theme.space[2],
      paddingHorizontal: theme.space[2],
      borderRadius: theme.radius.sm,
    },
    rowText: { flex: 1, minWidth: 0 },
    rowTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text.primary },
    rowSubtitle: { fontSize: 13, color: theme.colors.text.secondary, marginTop: 2 },
  })
}
