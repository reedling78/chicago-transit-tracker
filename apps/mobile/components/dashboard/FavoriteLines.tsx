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
        <View>
          {lineFavorites.map((fav) => {
            const line = lineMap.get(fav.id)
            const target = line ? `/${line.service}/${line.slug}` : null
            return (
              <Pressable
                key={fav.id}
                onPress={() => target && router.push(target as never)}
                disabled={!target}
                accessibilityRole="link"
                accessibilityLabel={line?.name ?? fav.id}
                style={styles.row}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={1}>
                    {line?.name ?? fav.id}
                  </Text>
                  {line?.termini?.length ? (
                    <Text style={styles.subtitle} numberOfLines={1}>
                      {line.termini.join(' — ')}
                    </Text>
                  ) : null}
                </View>
                {line ? (
                  <View style={[styles.chip, { backgroundColor: line.color }]}>
                    <Text style={[styles.chipText, { color: line.textColor }]} numberOfLines={1}>
                      {line.shortName}
                    </Text>
                  </View>
                ) : null}
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
  heading: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  placeholder: { color: '#9ca3af', fontSize: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  title: { color: '#fff', fontSize: 15, fontWeight: '600' },
  subtitle: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipText: { fontSize: 12, fontWeight: '700' },
})
