import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useFavoritesStore } from '../../lib/store/favorites'
import { useAuth } from '../../lib/AuthContext'
import { useLinesQuery } from '../../lib/useDashboardQueries'

export default function FavoriteLines() {
  const { user, loading } = useAuth()
  const favorites = useFavoritesStore((s) => s.favorites)
  const { data: lines } = useLinesQuery()
  const router = useRouter()

  const lineFavorites = favorites.filter((f) => f.type === 'line')
  const lineMap = new Map((lines ?? []).map((l) => [l.slug, l]))

  if (loading) return null

  return (
    <View style={styles.section} accessibilityRole="header">
      <Text style={styles.heading}>Favorite Lines</Text>
      {!user && <Text style={styles.placeholder}>Sign in to save your favorite lines.</Text>}
      {user && lineFavorites.length === 0 && (
        <Text style={styles.placeholder}>Tap the heart on a line to save it here.</Text>
      )}
      {user && lineFavorites.length > 0 && (
        <View style={styles.chipRow}>
          {lineFavorites.map((fav) => {
            const line = lineMap.get(fav.id)
            const display = line?.name ?? fav.id
            const target = line ? `/(tabs)/${line.service}/${line.slug}` : null
            return (
              <Pressable
                key={fav.id}
                onPress={() => target && router.push(target as never)}
                disabled={!target}
                accessibilityRole="link"
                style={[styles.chip, line ? { backgroundColor: line.color } : styles.chipFallback]}
              >
                <Text style={[styles.chipText, { color: line?.textColor ?? '#fff' }]}>
                  {display}
                </Text>
              </Pressable>
            )
          })}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  heading: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  placeholder: {
    color: '#9ca3af',
    fontSize: 14,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipFallback: { backgroundColor: '#374151' },
  chipText: { fontSize: 13, fontWeight: '600' },
})
