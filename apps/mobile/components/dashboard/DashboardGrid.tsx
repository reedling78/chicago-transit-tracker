import { useCallback, useMemo, useRef, type ReactNode } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist'
import type { DashboardItem, Line, Station } from '@ctt/shared'
import { useAuth } from '../../lib/AuthContext'
import { useDashboardStore } from '../../lib/store/dashboard'
import { useLinesQuery, useStationsQuery } from '../../lib/useDashboardQueries'
import { useReorderDashboardItems } from '../../lib/useReorderDashboardItems'
import { useTheme } from '../../lib/theme'
import type { Theme } from '../../lib/theme'
import LineCard from './cards/LineCard'
import StationCard from './cards/StationCard'
import TrainCard from './cards/TrainCard'
import DashboardItemMenuSheet, { type DashboardItemMenuSheetHandle } from './DashboardItemMenuSheet'
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
  const items = useDashboardStore((s) => s.items)
  const { data: lines } = useLinesQuery()
  const { data: stations } = useStationsQuery()
  const { reorder } = useReorderDashboardItems()
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
  const sheetRef = useRef<DashboardItemMenuSheetHandle>(null)
  const pickerRef = useRef<TrainStopPickerSheetHandle>(null)

  const lineMap = new Map((lines ?? []).map((l) => [l.slug, l]))
  const stationMap = new Map((stations ?? []).map((s) => [s.slug, s]))

  const onMenuPress = useCallback((item: DashboardItem) => {
    sheetRef.current?.open(item)
  }, [])

  const onSetTrainStop = useCallback((item: DashboardItem, mode: 'origin' | 'destination') => {
    pickerRef.current?.open({ item, mode })
  }, [])

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<DashboardItem>) =>
      renderItemCard({
        item,
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

  const showList = !loading && !!user && items.length > 0

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
      <DraggableFlatList<DashboardItem>
        data={items}
        keyExtractor={(item) => `${item.type}:${item.id}`}
        renderItem={renderItem}
        onDragEnd={({ data }) => reorder(data)}
        activationDistance={8}
        contentContainerStyle={[styles.listContent, { paddingTop: contentTopInset }]}
        ListHeaderComponent={header ? <View>{header}</View> : null}
        ListFooterComponent={listFooter}
      />
      <DashboardItemMenuSheet
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
  item: DashboardItem
  lines: Line[] | undefined
  lineMap: Map<string, Line>
  stationMap: Map<string, Station>
  drag: () => void
  isActive: boolean
  onMenuPress: (fav: DashboardItem) => void
}

function renderItemCard({
  item,
  lines,
  lineMap,
  stationMap,
  drag,
  isActive,
  onMenuPress,
}: RenderArgs) {
  if (item.type === 'line') {
    return (
      <LineCard
        item={item}
        line={lineMap.get(item.id)}
        onLongPress={drag}
        onMenuPress={() => onMenuPress(item)}
        isActive={isActive}
      />
    )
  }
  if (item.type === 'station') {
    return (
      <StationCard
        item={item}
        station={stationMap.get(item.id)}
        lines={lines}
        onLongPress={drag}
        onMenuPress={() => onMenuPress(item)}
        isActive={isActive}
      />
    )
  }
  return (
    <TrainCard
      item={item}
      lines={lines}
      onLongPress={drag}
      onMenuPress={() => onMenuPress(item)}
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
