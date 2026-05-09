import { useCallback, useMemo, useRef, type ReactNode } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist'
import type { Favorite, Line, Station } from '@ctt/shared'
import { useAuth } from '../../lib/AuthContext'
import { useFavoritesStore } from '../../lib/store/favorites'
import { useLinesQuery, useStationsQuery } from '../../lib/useDashboardQueries'
import { useReorderFavorites } from '../../lib/useReorderFavorites'
import { useTheme } from '../../lib/theme'
import type { Theme } from '../../lib/theme'
import LineCard from './cards/LineCard'
import StationCard from './cards/StationCard'
import TrainCard from './cards/TrainCard'
import FavoriteMenuSheet, { type FavoriteMenuSheetHandle } from './FavoriteMenuSheet'
import TrainStopPickerSheet, { type TrainStopPickerSheetHandle } from './TrainStopPickerSheet'

interface DashboardGridProps {
  header?: ReactNode
  footer?: ReactNode
  contentTopInset?: number
}

export default function DashboardGrid({
  header,
  footer,
  contentTopInset = 0,
}: DashboardGridProps = {}) {
  const { user, loading } = useAuth()
  const favorites = useFavoritesStore((s) => s.favorites)
  const { data: lines } = useLinesQuery()
  const { data: stations } = useStationsQuery()
  const { reorder } = useReorderFavorites()
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
  const sheetRef = useRef<FavoriteMenuSheetHandle>(null)
  const pickerRef = useRef<TrainStopPickerSheetHandle>(null)

  const lineMap = new Map((lines ?? []).map((l) => [l.slug, l]))
  const stationMap = new Map((stations ?? []).map((s) => [s.slug, s]))

  const onMenuPress = useCallback((favorite: Favorite) => {
    sheetRef.current?.open(favorite)
  }, [])

  const onSetTrainStop = useCallback((favorite: Favorite, mode: 'origin' | 'destination') => {
    pickerRef.current?.open({ favorite, mode })
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

  const showList = !loading && !!user && favorites.length > 0

  if (!showList) {
    return (
      <ScrollView contentContainerStyle={[styles.fallbackContent, { paddingTop: contentTopInset }]}>
        {header}
        {footer}
      </ScrollView>
    )
  }

  const listFooter = (
    <View>
      <Text style={styles.footerHint}>
        Tip: long-press a card to drag it up or down. Tap ⋯ for more options.
      </Text>
      {footer}
    </View>
  )

  return (
    <>
      <DraggableFlatList<Favorite>
        data={favorites}
        keyExtractor={(item) => `${item.type}:${item.id}`}
        renderItem={renderItem}
        onDragEnd={({ data }) => reorder(data)}
        activationDistance={8}
        contentContainerStyle={[styles.listContent, { paddingTop: contentTopInset }]}
        ListHeaderComponent={header ? <View>{header}</View> : null}
        ListFooterComponent={listFooter}
      />
      <FavoriteMenuSheet
        ref={sheetRef}
        lines={lines}
        stations={stations}
        onSetTrainStop={onSetTrainStop}
      />
      <TrainStopPickerSheet ref={pickerRef} />
    </>
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
      lines={lines}
      onLongPress={drag}
      onMenuPress={() => onMenuPress(favorite)}
      isActive={isActive}
    />
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    listContent: { paddingHorizontal: theme.space[4], paddingBottom: 40 },
    fallbackContent: { paddingHorizontal: theme.space[4], paddingBottom: 40 },
    footerHint: {
      color: theme.colors.text.muted,
      fontSize: 12,
      fontStyle: 'italic',
      marginTop: theme.space[2],
      marginBottom: theme.space[6],
      paddingHorizontal: theme.space[1],
    },
  })
}
