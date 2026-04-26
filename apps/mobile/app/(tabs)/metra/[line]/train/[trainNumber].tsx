import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useMetraTrip } from '../../../../../lib/hooks'
import MetraTripRealtime from '../../../../../components/MetraTripRealtime'
import FavoriteButton from '../../../../../components/FavoriteButton'

export default function MetraTrainDetailScreen() {
  const { line, trainNumber } = useLocalSearchParams<{ line: string; trainNumber: string }>()
  const lineSlug = line ?? ''
  const train = trainNumber ?? ''
  const { trip, loading } = useMetraTrip(lineSlug, train)

  return (
    <>
      <Stack.Screen options={{ title: train ? `Train ${train}` : 'Train' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#9ca3af" />
          </View>
        )}
        {!loading && !trip && (
          <View style={styles.center}>
            <Text style={styles.title}>Train not found</Text>
            <Text style={styles.subtitle}>
              We couldn&apos;t find {train} on the {lineSlug.toUpperCase()} line.
            </Text>
          </View>
        )}
        {!loading && trip && (
          <>
            <View style={styles.favoriteRow}>
              <Text style={styles.favoriteLabel}>{`Train ${train}`}</Text>
              <FavoriteButton type="train" id={`${lineSlug}_${train}`} />
            </View>
            <MetraTripRealtime trip={trip} lineSlug={lineSlug} />
          </>
        )}
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1e',
  },
  content: {
    paddingVertical: 8,
  },
  center: {
    flex: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  favoriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  favoriteLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
})
