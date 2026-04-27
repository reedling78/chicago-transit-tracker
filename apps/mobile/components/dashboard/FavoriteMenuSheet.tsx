import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import {
  listStationHeadsigns,
  type Favorite,
  type FavoriteDensity,
  type FavoriteDirection,
  type Line,
  type Station,
} from '@ctt/shared'
import { favoriteRoute } from '../../lib/favoriteRoute'
import { useToggleFavorite } from '../../lib/useToggleFavorite'
import { useUpdateFavoriteSettings } from '../../lib/useUpdateFavoriteSettings'
import { useStationScheduleQuery } from '../../lib/useDashboardQueries'

export interface FavoriteMenuSheetHandle {
  open: (favorite: Favorite) => void
}

interface FavoriteMenuSheetProps {
  lines: Line[] | undefined
  stations: Station[] | undefined
  /**
   * Train favorites only. Invoked when the user picks a "Set departure
   * station…" or "Set destination station…" item — the dashboard owns the
   * picker sheet and opens it in response. Items are hidden when omitted.
   */
  onSetTrainStop?: (favorite: Favorite, which: 'origin' | 'destination') => void
}

const SNAP_POINTS_DEFAULT = ['40%']
const SNAP_POINTS_STATION = ['55%']

const FavoriteMenuSheet = forwardRef<FavoriteMenuSheetHandle, FavoriteMenuSheetProps>(
  function FavoriteMenuSheet({ lines, stations, onSetTrainStop }, ref) {
    const sheetRef = useRef<BottomSheetModal>(null)
    const [active, setActive] = useState<Favorite | null>(null)

    useImperativeHandle(ref, () => ({
      open: (favorite) => {
        setActive(favorite)
        sheetRef.current?.present()
      },
    }))

    const renderBackdrop = useMemo(
      () =>
        function Backdrop(props: BottomSheetBackdropProps) {
          return (
            <BottomSheetBackdrop
              {...props}
              appearsOnIndex={0}
              disappearsOnIndex={-1}
              opacity={0.5}
            />
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
              favorite={active}
              lines={lines}
              stations={stations}
              onSetTrainStop={onSetTrainStop}
              dismiss={() => sheetRef.current?.dismiss()}
            />
          ) : null}
        </BottomSheetView>
      </BottomSheetModal>
    )
  },
)

interface MenuContentsProps {
  favorite: Favorite
  lines: Line[] | undefined
  stations: Station[] | undefined
  onSetTrainStop?: (favorite: Favorite, which: 'origin' | 'destination') => void
  dismiss: () => void
}

function MenuContents({ favorite, lines, stations, onSetTrainStop, dismiss }: MenuContentsProps) {
  const router = useRouter()
  const { toggle } = useToggleFavorite(favorite.type, favorite.id)
  const { update } = useUpdateFavoriteSettings(favorite.type, favorite.id)
  const route = favoriteRoute(favorite, lines, stations)
  const title = labelForFavorite(favorite, lines, stations)

  const isStation = favorite.type === 'station'
  const station = isStation ? stations?.find((s) => s.slug === favorite.id) : undefined
  const isMetra = station?.service === 'metra' || station?.service === 'both'
  const density: FavoriteDensity = favorite.density ?? 'expanded'
  const direction: FavoriteDirection = favorite.directionFilter ?? 'all'

  // Only fetch schedule for non-Metra (CTA) stations to populate headsign chips.
  const scheduleQuery = useStationScheduleQuery(isStation && !isMetra ? favorite.id : null)

  const directionOptions: { key: FavoriteDirection; label: string }[] = isStation
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
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {isStation ? (
        <>
          <ToggleRow
            label="View"
            options={[
              { key: 'expanded', label: 'Expanded' },
              { key: 'compact', label: 'Compact' },
            ]}
            active={density}
            onSelect={(value) => update({ density: value as FavoriteDensity })}
          />
          <ToggleRow
            label="Show"
            options={directionOptions}
            active={direction}
            onSelect={(value) => update({ directionFilter: value })}
          />
          <View style={styles.divider} />
        </>
      ) : null}
      <MenuItem
        label="Open details"
        disabled={!route}
        onPress={() => {
          dismiss()
          if (route) router.push(route as never)
        }}
      />
      {favorite.type === 'train' && onSetTrainStop ? (
        <>
          <MenuItem
            label="Set departure station…"
            onPress={() => {
              dismiss()
              onSetTrainStop(favorite, 'origin')
            }}
          />
          <MenuItem
            label="Set destination station…"
            onPress={() => {
              dismiss()
              onSetTrainStop(favorite, 'destination')
            }}
          />
        </>
      ) : null}
      <MenuItem
        label="Mute alerts"
        onPress={() => {
          dismiss()
          Alert.alert('Coming soon', 'Per-favorite alert muting is on the roadmap.')
        }}
      />
      <MenuItem
        label="Share"
        onPress={() => {
          dismiss()
          Alert.alert('Coming soon', 'Sharing is on the roadmap.')
        }}
      />
      <MenuItem
        label="Remove from favorites"
        destructive
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
}

function ToggleRow<T extends string>({ label, options, active, onSelect }: ToggleRowProps<T>) {
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
}

function MenuItem({ label, onPress, destructive, disabled }: MenuItemProps) {
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

function labelForFavorite(
  favorite: Favorite,
  lines: Line[] | undefined,
  stations: Station[] | undefined,
): string {
  if (favorite.type === 'line') {
    const line = (lines ?? []).find((l) => l.slug === favorite.id)
    return line?.name ?? favorite.id
  }
  if (favorite.type === 'station') {
    const station = (stations ?? []).find((s) => s.slug === favorite.id)
    return station?.name ?? favorite.id
  }
  const [, trainNumber] = favorite.id.split('_')
  return `Train ${trainNumber ?? favorite.id}`
}

const styles = StyleSheet.create({
  background: { backgroundColor: '#1f2937' },
  handle: { backgroundColor: '#4b5563' },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  toggleRow: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  toggleLabel: {
    color: '#9ca3af',
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
    backgroundColor: '#374151',
  },
  chipSelected: { backgroundColor: '#2563eb' },
  chipText: { color: '#e5e7eb', fontSize: 13, fontWeight: '500' },
  chipTextSelected: { color: '#fff' },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#374151',
    marginVertical: 6,
  },
  item: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  itemPressed: {
    backgroundColor: '#374151',
  },
  itemDisabled: {
    opacity: 0.4,
  },
  itemText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  destructive: {
    color: '#f87171',
  },
})

export default FavoriteMenuSheet
