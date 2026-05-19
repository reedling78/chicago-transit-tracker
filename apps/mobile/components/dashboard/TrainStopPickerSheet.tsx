import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Favorite, TripStop } from '@ctt/shared'
import { useFavoritesStore } from '../../lib/store/favorites'
import { useFavoriteTripQuery } from '../../lib/useDashboardQueries'
import { useUpdateFavoriteSettings } from '../../lib/useUpdateFavoriteSettings'
import { useTheme } from '../../lib/theme'
import type { Theme } from '../../lib/theme'

interface OpenArgs {
  favorite: Favorite
  mode: 'origin' | 'destination'
}

export interface TrainStopPickerSheetHandle {
  open: (args: OpenArgs) => void
}

const SNAP_POINTS = ['80%']

const TrainStopPickerSheet = forwardRef<TrainStopPickerSheetHandle>(
  function TrainStopPickerSheet(_props, ref) {
    const sheetRef = useRef<BottomSheetModal>(null)
    const [active, setActive] = useState<OpenArgs | null>(null)
    const { theme } = useTheme()
    const styles = useMemo(() => makeStyles(theme), [theme])

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
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => makeStyles(theme), [theme])
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
    <View style={styles.flex}>
      <Text style={styles.title}>
        {mode === 'origin' ? 'Set departure station' : 'Set destination station'}
      </Text>
      <BottomSheetScrollView
        contentContainerStyle={{ paddingBottom: theme.space[6] + insets.bottom }}
      >
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
      </BottomSheetScrollView>
    </View>
  )
}

function pickStopBySlug(stops: TripStop[], slug: string | undefined): TripStop | undefined {
  if (!slug) return undefined
  return stops.find((s) => s.slug === slug)
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    background: { backgroundColor: theme.colors.bg.surface },
    handle: { backgroundColor: theme.colors.border.strong },
    content: {
      paddingHorizontal: theme.space[4],
      flex: 1,
    },
    flex: { flex: 1 },
    title: {
      color: theme.colors.text.primary,
      fontSize: 18,
      fontWeight: '700',
      marginBottom: theme.space[3],
      paddingHorizontal: theme.space[1],
    },
    empty: {
      color: theme.colors.text.secondary,
      fontSize: 14,
      paddingHorizontal: theme.space[1],
      paddingVertical: theme.space[3],
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.space[3],
      paddingHorizontal: theme.space[3],
      borderRadius: theme.radius.sm + 2,
    },
    rowSelected: { backgroundColor: 'rgba(37, 99, 235, 0.15)' },
    rowPressed: { backgroundColor: theme.colors.border.subtle },
    rowDisabled: { opacity: 0.4 },
    rowName: { color: theme.colors.text.primary, fontSize: 15, fontWeight: '500', flex: 1 },
    rowNameSelected: { color: '#93c5fd' },
    rowTime: { color: theme.colors.text.secondary, fontSize: 13, fontVariant: ['tabular-nums'] },
  })
}

export default TrainStopPickerSheet
