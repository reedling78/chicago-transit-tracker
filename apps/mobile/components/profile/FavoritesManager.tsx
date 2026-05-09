import { useMemo } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import type { Favorite } from '@ctt/shared'
import { useFavoritesStore } from '../../lib/store/favorites'
import { useLinesQuery, useStationsQuery } from '../../lib/useDashboardQueries'
import { useClearAllFavorites } from '../../lib/useClearAllFavorites'
import { useTheme } from '../../lib/theme'
import type { Theme } from '../../lib/theme'
import FavoritesSection from './FavoritesSection'

export default function FavoritesManager() {
  const favorites = useFavoritesStore((s) => s.favorites)
  const { data: lines } = useLinesQuery()
  const { data: stations } = useStationsQuery()
  const { clearAll, isClearing } = useClearAllFavorites()
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])

  const groups = useMemo(() => {
    const lineFavs: Favorite[] = []
    const stationFavs: Favorite[] = []
    const trainFavs: Favorite[] = []
    for (const f of favorites) {
      if (f.type === 'line') lineFavs.push(f)
      else if (f.type === 'station') stationFavs.push(f)
      else if (f.type === 'train') trainFavs.push(f)
    }
    return { lineFavs, stationFavs, trainFavs }
  }, [favorites])

  const empty = favorites.length === 0

  function handleClearAll() {
    if (empty) return
    Alert.alert(
      'Clear all favorites?',
      `This will remove all ${favorites.length} favorite${favorites.length === 1 ? '' : 's'}. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear all', style: 'destructive', onPress: () => clearAll() },
      ],
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Favorites</Text>
        <Pressable
          onPress={handleClearAll}
          disabled={empty || isClearing}
          accessibilityRole="button"
          accessibilityLabel="Clear all favorites"
        >
          <Text style={[styles.clearButton, (empty || isClearing) && styles.clearButtonDisabled]}>
            Clear all
          </Text>
        </Pressable>
      </View>

      {empty ? (
        <Text style={styles.emptyText}>
          No favorites yet — tap the heart on any line, station, or train to save it.
        </Text>
      ) : (
        <View style={styles.sections}>
          <FavoritesSection
            title="Lines"
            favorites={groups.lineFavs}
            lines={lines}
            stations={stations}
          />
          <FavoritesSection
            title="Stations"
            favorites={groups.stationFavs}
            lines={lines}
            stations={stations}
          />
          <FavoritesSection
            title="Trains"
            favorites={groups.trainFavs}
            lines={lines}
            stations={stations}
          />
        </View>
      )}
    </View>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      marginTop: theme.space[6],
      backgroundColor: theme.colors.bg.surface,
      borderRadius: theme.radius.md,
      padding: theme.space[5],
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.space[4],
    },
    heading: { fontSize: 18, fontWeight: '700', color: theme.colors.text.primary },
    clearButton: {
      color: '#f87171',
      fontSize: 14,
      fontWeight: '600',
      paddingVertical: 6,
      paddingHorizontal: theme.space[1],
    },
    clearButtonDisabled: { color: theme.colors.text.muted },
    emptyText: { color: theme.colors.text.secondary, fontSize: 14, lineHeight: 20 },
    sections: { gap: theme.space[5] },
  })
}
