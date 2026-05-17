import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { displayStationName } from '@ctt/shared'
import type { Favorite, Line, Station } from '@ctt/shared'
import { favoriteRoute } from '../../lib/favoriteRoute'
import { useToggleFavorite } from '../../lib/useToggleFavorite'
import { useFavoriteTripQuery } from '../../lib/useDashboardQueries'
import { useTheme } from '../../lib/theme'
import type { Theme } from '../../lib/theme'

interface FavoriteRowProps {
  favorite: Favorite
  lines: Line[] | undefined
  stations: Station[] | undefined
  isLast?: boolean
}

export default function FavoriteRow({ favorite, lines, stations, isLast }: FavoriteRowProps) {
  const router = useRouter()
  const { toggle, isToggling } = useToggleFavorite(favorite.type, favorite.id)
  const { title, subtitle } = useRowContent(favorite, lines, stations)
  const route = favoriteRoute(favorite, lines, stations)
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])

  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <Pressable
        onPress={() => route && router.push(route as never)}
        disabled={!route}
        accessibilityRole="link"
        accessibilityLabel={title}
        style={styles.pressable}
      >
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </Pressable>
      <Pressable
        onPress={toggle}
        disabled={isToggling}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${title} from favorites`}
        hitSlop={8}
        style={styles.removeButton}
      >
        <Ionicons name="trash-outline" size={20} color="#f87171" />
      </Pressable>
    </View>
  )
}

function useRowContent(
  favorite: Favorite,
  lines: Line[] | undefined,
  stations: Station[] | undefined,
) {
  const isTrain = favorite.type === 'train'
  const { data: trip } = useFavoriteTripQuery(isTrain ? favorite.id : null)

  if (favorite.type === 'line') {
    const line = lines?.find((l) => l.slug === favorite.id)
    return {
      title: line?.name ?? favorite.id,
      subtitle: line?.termini?.length ? line.termini.join(' — ') : null,
    }
  }
  if (favorite.type === 'station') {
    const station = stations?.find((s) => s.slug === favorite.id)
    return {
      title: displayStationName(station?.name) ?? favorite.id,
      subtitle: station?.lines?.length ? station.lines.join(' • ') : null,
    }
  }
  const [lineSlug, trainNumberFromId] = favorite.id.split('_')
  const trainNumber = trip?.trainNumber ?? trainNumberFromId ?? favorite.id
  const subtitle = trip
    ? trip.headsign
      ? `To ${trip.headsign}`
      : (trip.lineName ?? lineSlug)
    : 'Trip not currently scheduled'
  return { title: `Train ${trainNumber}`, subtitle }
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.space[3],
      paddingHorizontal: 14,
      gap: theme.space[3],
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border.subtle,
    },
    pressable: { flex: 1 },
    title: { color: theme.colors.text.primary, fontSize: 15, fontWeight: '600' },
    subtitle: { color: theme.colors.text.secondary, fontSize: 12, marginTop: 2 },
    removeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  })
}
