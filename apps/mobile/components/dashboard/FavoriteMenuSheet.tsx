import { forwardRef, useImperativeHandle, useRef, useState, useMemo } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import type { Favorite, Line, Station } from '@ctt/shared'
import { favoriteRoute } from '../../lib/favoriteRoute'
import { useToggleFavorite } from '../../lib/useToggleFavorite'

export interface FavoriteMenuSheetHandle {
  open: (favorite: Favorite) => void
}

interface FavoriteMenuSheetProps {
  lines: Line[] | undefined
  stations: Station[] | undefined
}

const SNAP_POINTS = ['40%']

const FavoriteMenuSheet = forwardRef<FavoriteMenuSheetHandle, FavoriteMenuSheetProps>(
  function FavoriteMenuSheet({ lines, stations }, ref) {
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
            <MenuContents
              favorite={active}
              lines={lines}
              stations={stations}
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
  dismiss: () => void
}

function MenuContents({ favorite, lines, stations, dismiss }: MenuContentsProps) {
  const router = useRouter()
  const { toggle } = useToggleFavorite(favorite.type, favorite.id)
  const route = favoriteRoute(favorite, lines, stations)

  const title = labelForFavorite(favorite, lines, stations)

  return (
    <View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <MenuItem
        label="Open details"
        disabled={!route}
        onPress={() => {
          dismiss()
          if (route) router.push(route as never)
        }}
      />
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
