import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useFavoritesStore } from '../../lib/store/favorites'
import { useAuth } from '../../lib/AuthContext'
import { useLinesQuery, useStationsQuery } from '../../lib/useDashboardQueries'

export default function FavoriteStations() {
  const { user, loading } = useAuth()
  const favorites = useFavoritesStore((s) => s.favorites)
  const { data: stations } = useStationsQuery()
  const { data: lines } = useLinesQuery()
  const router = useRouter()

  const stationFavorites = favorites.filter((f) => f.type === 'station')
  const stationMap = new Map((stations ?? []).map((s) => [s.slug, s]))
  const lineByShortName = new Map((lines ?? []).map((l) => [l.shortName, l]))

  if (loading) return null

  return (
    <View style={styles.section} accessibilityRole="header">
      <Text style={styles.heading}>Favorite Stations</Text>
      {!user && <Text style={styles.placeholder}>Sign in to save your favorite stations.</Text>}
      {user && stationFavorites.length === 0 && (
        <Text style={styles.placeholder}>Tap the heart on a station to save it here.</Text>
      )}
      {user && stationFavorites.length > 0 && (
        <View>
          {stationFavorites.map((fav) => {
            const station = stationMap.get(fav.id)
            if (!station) return null
            const firstLineShort = station.lines[0]
            const line = firstLineShort ? lineByShortName.get(firstLineShort) : undefined
            const target = line
              ? `/(tabs)/${line.service}/station/${station.slug}`
              : `/(tabs)/${station.service === 'metra' ? 'metra' : 'cta'}`
            return (
              <Pressable
                key={fav.id}
                onPress={() => router.push(target as never)}
                accessibilityRole="link"
                accessibilityLabel={station.name}
                style={styles.row}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{station.name}</Text>
                  <Text style={styles.subtitle}>{station.lines.join(' • ')}</Text>
                </View>
                <Text style={styles.meta}>{station.service === 'metra' ? 'Metra' : 'CTA'}</Text>
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
  meta: { color: '#9ca3af', fontSize: 12 },
})
