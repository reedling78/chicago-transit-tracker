import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import type { Favorite, TripStop } from '@ctt/shared'
import { useFavoritesStore } from '../../lib/store/favorites'
import { useFavoriteTripQuery } from '../../lib/useDashboardQueries'
import { useUpdateFavoriteSettings } from '../../lib/useUpdateFavoriteSettings'

interface OpenArgs {
  favorite: Favorite
  mode: 'origin' | 'destination'
}

export interface TrainStopPickerSheetHandle {
  open: (args: OpenArgs) => void
}

const SNAP_POINTS = ['70%']

const TrainStopPickerSheet = forwardRef<TrainStopPickerSheetHandle>(
  function TrainStopPickerSheet(_props, ref) {
    const sheetRef = useRef<BottomSheetModal>(null)
    const [active, setActive] = useState<OpenArgs | null>(null)

    useImperativeHandle(ref, () => ({
      open: (args) => {
        setActive(args)
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

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={SNAP_POINTS}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.background}
        handleIndicatorStyle={styles.handle}
        onDismiss={() => setActive(null)}
      >
        <BottomSheetView style={styles.content}>
          {active ? (
            <PickerContents args={active} dismiss={() => sheetRef.current?.dismiss()} />
          ) : null}
        </BottomSheetView>
      </BottomSheetModal>
    )
  },
)

interface PickerContentsProps {
  args: OpenArgs
  dismiss: () => void
}

function PickerContents({ args, dismiss }: PickerContentsProps) {
  const { favorite, mode } = args
  const { data: trip } = useFavoriteTripQuery(favorite.id)
  const { update } = useUpdateFavoriteSettings(favorite.type, favorite.id)
  // Read the live store so the user's current overrides anchor the eligibility
  // rules even after a previous picker selection in the same session.
  const liveFavorite = useFavoritesStore((s) =>
    s.favorites.find((f) => f.type === favorite.type && f.id === favorite.id),
  )
  const effective = liveFavorite ?? favorite

  const stops = trip?.stops ?? []
  const firstStop = stops[0]
  const lastStop = stops[stops.length - 1]
  const originSeq =
    pickStopBySlug(stops, effective.trainOriginStopSlug)?.sequence ?? firstStop?.sequence ?? 0
  const destSeq =
    pickStopBySlug(stops, effective.trainDestinationStopSlug)?.sequence ??
    lastStop?.sequence ??
    Number.POSITIVE_INFINITY
  const currentSlug =
    mode === 'origin'
      ? (effective.trainOriginStopSlug ?? firstStop?.slug ?? null)
      : (effective.trainDestinationStopSlug ?? lastStop?.slug ?? null)

  const eligible = stops.filter((s) =>
    mode === 'origin' ? s.sequence < destSeq : s.sequence > originSeq,
  )

  return (
    <View>
      <Text style={styles.title}>
        {mode === 'origin' ? 'Set departure station' : 'Set destination station'}
      </Text>
      <ScrollView>
        {eligible.length === 0 ? (
          <Text style={styles.empty}>No eligible stops.</Text>
        ) : (
          eligible.map((stop) => {
            const selected = stop.slug === currentSlug
            const disabled = !stop.slug
            return (
              <Pressable
                key={stop.sequence}
                onPress={() => {
                  if (!stop.slug) return
                  update(
                    mode === 'origin'
                      ? { trainOriginStopSlug: stop.slug }
                      : { trainDestinationStopSlug: stop.slug },
                  )
                  dismiss()
                }}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled }}
                accessibilityLabel={stop.stationName}
                style={({ pressed }) => [
                  styles.row,
                  selected && styles.rowSelected,
                  pressed && !disabled && styles.rowPressed,
                  disabled && styles.rowDisabled,
                ]}
              >
                <Text style={[styles.rowName, selected && styles.rowNameSelected]}>
                  {stop.stationName}
                </Text>
                <Text style={styles.rowTime}>
                  {mode === 'origin' ? stop.departure : stop.arrival}
                </Text>
              </Pressable>
            )
          })
        )}
      </ScrollView>
    </View>
  )
}

function pickStopBySlug(stops: TripStop[], slug: string | undefined): TripStop | undefined {
  if (!slug) return undefined
  return stops.find((s) => s.slug === slug)
}

const styles = StyleSheet.create({
  background: { backgroundColor: '#1f2937' },
  handle: { backgroundColor: '#4b5563' },
  content: { paddingHorizontal: 16, paddingBottom: 24, flex: 1 },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  empty: { color: '#9ca3af', fontSize: 14, paddingHorizontal: 4, paddingVertical: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  rowSelected: { backgroundColor: 'rgba(37, 99, 235, 0.15)' },
  rowPressed: { backgroundColor: '#374151' },
  rowDisabled: { opacity: 0.4 },
  rowName: { color: '#fff', fontSize: 15, fontWeight: '500', flex: 1 },
  rowNameSelected: { color: '#93c5fd' },
  rowTime: { color: '#9ca3af', fontSize: 13, fontVariant: ['tabular-nums'] },
})

export default TrainStopPickerSheet
