import { useCallback, useRef } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist'
import type { Favorite, Line, Station } from '@ctt/shared'
import { useAuth } from '../../lib/AuthContext'
import { useFavoritesStore } from '../../lib/store/favorites'
import { useLinesQuery, useStationsQuery } from '../../lib/useDashboardQueries'
import { useReorderFavorites } from '../../lib/useReorderFavorites'
import LineCard from './cards/LineCard'
import StationCard from './cards/StationCard'
import TrainCard from './cards/TrainCard'
import FavoriteMenuSheet, { type FavoriteMenuSheetHandle } from './FavoriteMenuSheet'

export default function DashboardGrid() {
  const { user, loading } = useAuth()
  const favorites = useFavoritesStore((s) => s.favorites)
  const { data: lines } = useLinesQuery()
  const { data: stations } = useStationsQuery()
  const { reorder } = useReorderFavorites()
  const sheetRef = useRef<FavoriteMenuSheetHandle>(null)

  const lineMap = new Map((lines ?? []).map((l) => [l.slug, l]))
  const stationMap = new Map((stations ?? []).map((s) => [s.slug, s]))

  const onMenuPress = useCallback((favorite: Favorite) => {
    sheetRef.current?.open(favorite)
  }, [])

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Favorite>) =>
      renderFavoriteCard({
        favorite: item,
        lines,
        lineMap,
        stationMap,
        drag,
        isActive,
        onMenuPress,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lines, stationMap.size, lineMap.size, onMenuPress],
  )

  if (loading || !user || favorites.length === 0) return null

  return (
    <View style={styles.section}>
      <DraggableFlatList<Favorite>
        data={favorites}
        keyExtractor={(item) => `${item.type}:${item.id}`}
        renderItem={renderItem}
        onDragEnd={({ data }) => reorder(data)}
        scrollEnabled={false}
        activationDistance={8}
      />
      <Text style={styles.footerHint}>
        Tip: long-press a card to drag it up or down. Tap ⋯ for more options.
      </Text>
      <FavoriteMenuSheet ref={sheetRef} lines={lines} stations={stations} />
    </View>
  )
}

interface RenderArgs {
  favorite: Favorite
  lines: Line[] | undefined
  lineMap: Map<string, Line>
  stationMap: Map<string, Station>
  drag: () => void
  isActive: boolean
  onMenuPress: (fav: Favorite) => void
}

function renderFavoriteCard({
  favorite,
  lines,
  lineMap,
  stationMap,
  drag,
  isActive,
  onMenuPress,
}: RenderArgs) {
  if (favorite.type === 'line') {
    return (
      <LineCard
        favorite={favorite}
        line={lineMap.get(favorite.id)}
        onLongPress={drag}
        onMenuPress={() => onMenuPress(favorite)}
        isActive={isActive}
      />
    )
  }
  if (favorite.type === 'station') {
    return (
      <StationCard
        favorite={favorite}
        station={stationMap.get(favorite.id)}
        lines={lines}
        onLongPress={drag}
        onMenuPress={() => onMenuPress(favorite)}
        isActive={isActive}
      />
    )
  }
  return (
    <TrainCard
      favorite={favorite}
      onLongPress={drag}
      onMenuPress={() => onMenuPress(favorite)}
      isActive={isActive}
    />
  )
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  footerHint: {
    color: '#6b7280',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
    paddingHorizontal: 4,
  },
})
