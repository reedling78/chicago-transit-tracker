import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useFavoritesStore } from '../../lib/store/favorites'
import { useAuth } from '../../lib/AuthContext'
import { useFavoriteTripQuery } from '../../lib/useDashboardQueries'

interface RowProps {
  tripId: string
}

function Row({ tripId }: RowProps) {
  const { data: trip } = useFavoriteTripQuery(tripId)
  const router = useRouter()
  const [lineSlug, trainNumberFromId] = tripId.split('_')
  const trainNumber = trip?.trainNumber ?? trainNumberFromId ?? tripId
  const subtitle = trip
    ? trip.headsign
      ? `To ${trip.headsign}`
      : (trip.lineName ?? lineSlug)
    : 'Trip not currently scheduled'
  return (
    <Pressable
      onPress={() => router.push(`/metra/${lineSlug}/train/${trainNumber}` as never)}
      accessibilityRole="link"
      accessibilityLabel={`Train ${trainNumber}`}
      style={styles.row}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{`Train ${trainNumber}`}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      {trip?.serviceType && <Text style={styles.meta}>{trip.serviceType}</Text>}
    </Pressable>
  )
}

export default function FavoriteTrains() {
  const { user, loading } = useAuth()
  const favorites = useFavoritesStore((s) => s.favorites)
  const trainFavorites = favorites.filter((f) => f.type === 'train')

  if (loading) return null

  return (
    <View style={styles.section} accessibilityRole="header">
      <Text style={styles.heading}>Favorite Trains</Text>
      {!user && <Text style={styles.placeholder}>Sign in to save your favorite trains.</Text>}
      {user && trainFavorites.length === 0 && (
        <Text style={styles.placeholder}>Tap the heart on a train page to save it here.</Text>
      )}
      {user && trainFavorites.length > 0 && (
        <View>
          {trainFavorites.map((fav) => (
            <Row key={fav.id} tripId={fav.id} />
          ))}
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
