import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import {
  listStationHeadsigns,
  shortenStationName,
  type DashboardItem,
  type DashboardItemDensity,
  type DashboardItemDirection,
  type Line,
  type Station,
  type TripStop,
} from '@ctt/shared'
import { dashboardItemRoute } from '../../lib/dashboardItemRoute'
import { useToggleDashboardItem } from '../../lib/useToggleDashboardItem'
import { useUpdateDashboardItemSettings } from '../../lib/useUpdateDashboardItemSettings'
import { useDashboardItemTripQuery, useStationScheduleQuery } from '../../lib/useDashboardQueries'
import { useDashboardStore } from '../../lib/store/dashboard'
import { useTheme } from '../../lib/theme'
import type { Theme } from '../../lib/theme'

export interface DashboardItemMenuSheetHandle {
  open: (item: DashboardItem) => void
}

interface DashboardItemMenuSheetProps {
  lines: Line[] | undefined
  stations: Station[] | undefined
  /**
   * Train items only. Invoked when the user picks a "Set departure
   * station…" or "Set destination station…" item — the dashboard owns the
   * picker sheet and opens it in response. Items are hidden when omitted.
   */
  onSetTrainStop?: (item: DashboardItem, which: 'origin' | 'destination') => void
}

const SNAP_POINTS_DEFAULT = ['40%']
const SNAP_POINTS_STATION = ['55%']

const DashboardItemMenuSheet = forwardRef<
  DashboardItemMenuSheetHandle,
  DashboardItemMenuSheetProps
>(function DashboardItemMenuSheet({ lines, stations, onSetTrainStop }, ref) {
  const sheetRef = useRef<BottomSheetModal>(null)
  const [active, setActive] = useState<DashboardItem | null>(null)
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])

  useImperativeHandle(ref, () => ({
    open: (item) => {
      setActive(item)
      sheetRef.current?.present()
    },
  }))

  const renderBackdrop = useMemo(
    () =>
      function Backdrop(props: BottomSheetBackdropProps) {
        return (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
        )
      },
    [],
  )

  const snapPoints = active?.type === 'station' ? SNAP_POINTS_STATION : SNAP_POINTS_DEFAULT

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
      onDismiss={() => setActive(null)}
    >
      <BottomSheetView style={styles.content}>
        {active ? (
          <MenuContents
            item={active}
            lines={lines}
            stations={stations}
            onSetTrainStop={onSetTrainStop}
            dismiss={() => sheetRef.current?.dismiss()}
          />
        ) : null}
      </BottomSheetView>
    </BottomSheetModal>
  )
})

interface MenuContentsProps {
  item: DashboardItem
  lines: Line[] | undefined
  stations: Station[] | undefined
  onSetTrainStop?: (item: DashboardItem, which: 'origin' | 'destination') => void
  dismiss: () => void
}

function MenuContents({ item, lines, stations, onSetTrainStop, dismiss }: MenuContentsProps) {
  const router = useRouter()
  const { toggle } = useToggleDashboardItem(item.type, item.id)
  const { update } = useUpdateDashboardItemSettings(item.type, item.id)
  const route = dashboardItemRoute(item, lines, stations)
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])

  // Subscribe to the live store so View/Show selections re-render the open
  // sheet immediately (the `item` prop is a snapshot from sheet-open time).
  const liveItem = useDashboardStore((s) =>
    s.items.find((f) => f.type === item.type && f.id === item.id),
  )
  const effective = liveItem ?? item

  const isTrain = item.type === 'train'
  const { data: trip } = useDashboardItemTripQuery(isTrain ? item.id : null)
  const [, trainNumberFromId] = item.id.split('_')
  const trainNumber = trip?.trainNumber ?? trainNumberFromId ?? item.id
  const originStop = pickStop(trip?.stops, item.trainOriginStopSlug, trip?.stops?.[0])
  const destStop = pickStop(
    trip?.stops,
    item.trainDestinationStopSlug,
    trip?.stops?.[(trip?.stops?.length ?? 0) - 1],
  )
  const title =
    isTrain && trip && originStop && destStop
      ? `${shortenStationName(originStop.stationName)} to ${shortenStationName(destStop.stationName)}`
      : labelForItem(item, lines, stations)
  const subtitle = isTrain && trip ? `${trip.line ? `${trip.line} ` : ''}#${trainNumber}` : null

  const isStation = item.type === 'station'
  const station = isStation ? stations?.find((s) => s.slug === item.id) : undefined
  const isMetra = station?.service === 'metra' || station?.service === 'both'
  const density: DashboardItemDensity = effective.density ?? 'expanded'
  const direction: DashboardItemDirection = effective.directionFilter ?? 'all'

  // Only fetch schedule for non-Metra (CTA) stations to populate headsign chips.
  const scheduleQuery = useStationScheduleQuery(isStation && !isMetra ? item.id : null)

  const directionOptions: { key: DashboardItemDirection; label: string }[] = isStation
    ? isMetra
      ? [
          { key: 'all', label: 'All' },
          { key: 'inbound', label: 'Inbound' },
          { key: 'outbound', label: 'Outbound' },
        ]
      : [
          { key: 'all', label: 'All' },
          ...listStationHeadsigns(scheduleQuery.data ?? null).map((headsign) => ({
            key: headsign,
            label: headsign,
          })),
        ]
    : []

  return (
    <View>
      <Text style={[styles.title, subtitle ? styles.titleTight : null]} numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
      {isStation ? (
        <>
          <ToggleRow
            label="View"
            options={[
              { key: 'expanded', label: 'Expanded' },
              { key: 'compact', label: 'Compact' },
            ]}
            active={density}
            onSelect={(value) => update({ density: value as DashboardItemDensity })}
            styles={styles}
          />
          <ToggleRow
            label="Show"
            options={directionOptions}
            active={direction}
            onSelect={(value) => update({ directionFilter: value })}
            styles={styles}
          />
          <View style={styles.divider} />
        </>
      ) : null}
      <MenuItem
        label="Open details"
        disabled={!route}
        styles={styles}
        onPress={() => {
          dismiss()
          if (route) router.push(route as never)
        }}
      />
      {item.type === 'train' && onSetTrainStop ? (
        <>
          <MenuItem
            label="Set departure station…"
            styles={styles}
            onPress={() => {
              dismiss()
              onSetTrainStop(item, 'origin')
            }}
          />
          <MenuItem
            label="Set destination station…"
            styles={styles}
            onPress={() => {
              dismiss()
              onSetTrainStop(item, 'destination')
            }}
          />
        </>
      ) : null}
      <MenuItem
        label="Remove from dashboard"
        destructive
        styles={styles}
        onPress={() => {
          dismiss()
          toggle()
        }}
      />
    </View>
  )
}

interface ToggleRowProps<T extends string = string> {
  label: string
  options: { key: T; label: string }[]
  active: T
  onSelect: (value: T) => void
  styles: ReturnType<typeof makeStyles>
}

function ToggleRow<T extends string>({
  label,
  options,
  active,
  onSelect,
  styles,
}: ToggleRowProps<T>) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((opt) => {
          const selected = opt.key === active
          return (
            <Pressable
              key={opt.key}
              onPress={() => onSelect(opt.key)}
              accessibilityRole="button"
              accessibilityLabel={`${label}: ${opt.label}`}
              accessibilityState={{ selected }}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {opt.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

interface MenuItemProps {
  label: string
  onPress: () => void
  destructive?: boolean
  disabled?: boolean
  styles: ReturnType<typeof makeStyles>
}

function MenuItem({ label, onPress, destructive, disabled, styles }: MenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.item,
        pressed && !disabled && styles.itemPressed,
        disabled && styles.itemDisabled,
      ]}
    >
      <Text style={[styles.itemText, destructive && styles.destructive]}>{label}</Text>
    </Pressable>
  )
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

function labelForItem(
  item: DashboardItem,
  lines: Line[] | undefined,
  stations: Station[] | undefined,
): string {
  if (item.type === 'line') {
    const line = (lines ?? []).find((l) => l.slug === item.id)
    return line?.name ?? item.id
  }
  if (item.type === 'station') {
    const station = (stations ?? []).find((s) => s.slug === item.id)
    return station?.name ?? item.id
  }
  const [, trainNumber] = item.id.split('_')
  return `Train ${trainNumber ?? item.id}`
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    background: { backgroundColor: theme.colors.bg.surface },
    handle: { backgroundColor: theme.colors.border.strong },
    content: { paddingHorizontal: theme.space[4], paddingBottom: theme.space[6] },
    title: {
      color: theme.colors.text.primary,
      fontSize: 18,
      fontWeight: '700',
      marginBottom: theme.space[3],
      paddingHorizontal: theme.space[1],
    },
    titleTight: { marginBottom: 2 },
    subtitle: {
      color: theme.colors.text.secondary,
      fontSize: 13,
      fontWeight: '500',
      marginTop: 2,
      marginBottom: theme.space[3],
      paddingHorizontal: theme.space[1],
    },
    toggleRow: { paddingHorizontal: theme.space[1], paddingVertical: theme.space[2] },
    toggleLabel: {
      color: theme.colors.text.secondary,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      marginBottom: 6,
      textTransform: 'uppercase',
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: theme.colors.border.subtle,
    },
    chipSelected: { backgroundColor: theme.colors.accent.primary },
    chipText: { color: theme.colors.text.secondary, fontSize: 13, fontWeight: '500' },
    chipTextSelected: { color: theme.colors.accent.primaryFg },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border.subtle,
      marginVertical: 6,
    },
    item: {
      paddingVertical: 14,
      paddingHorizontal: theme.space[3],
      borderRadius: theme.radius.sm + 2,
    },
    itemPressed: { backgroundColor: theme.colors.border.subtle },
    itemDisabled: { opacity: 0.4 },
    itemText: { color: theme.colors.text.primary, fontSize: 16, fontWeight: '500' },
    destructive: { color: '#f87171' },
  })
}

export default DashboardItemMenuSheet
