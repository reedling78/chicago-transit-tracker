import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { LINE_COLORS } from '@ctt/shared'
import { useMetraTrip } from '../../../../lib/hooks'
import MetraTripRealtime from '../../../../components/MetraTripRealtime'
import FavoriteButton from '../../../../components/FavoriteButton'

const FALLBACK_BG = '#0f0f1e'
const FALLBACK_FG = '#ffffff'

export default function MetraTrainDetailScreen() {
  const { line, trainNumber } = useLocalSearchParams<{ line: string; trainNumber: string }>()
  const lineSlug = line ?? ''
  const train = trainNumber ?? ''
  const { trip, loading } = useMetraTrip(lineSlug, train)

  const colors = trip ? LINE_COLORS[trip.line] : undefined
  const headerBg = colors?.bg ?? FALLBACK_BG
  const headerFg = colors?.text ?? FALLBACK_FG

  return (
    <>
      <Stack.Screen
        options={{
          headerTransparent: false,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: headerBg },
          headerTitle: () => (
            <View style={styles.headerTitleWrap}>
              <Text
                style={[styles.headerTitle, { color: headerFg }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {train ? `Train ${train}` : 'Train'}
              </Text>
              {trip?.lineName && (
                <Text style={[styles.headerSub, { color: headerFg }]} numberOfLines={1}>
                  {trip.lineName}
                </Text>
              )}
            </View>
          ),
          headerRight: () => <FavoriteButton type="train" id={`${lineSlug}_${train}`} />,
        }}
      />
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
        {!loading && trip && <MetraTripRealtime trip={trip} lineSlug={lineSlug} />}
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
    paddingTop: 8,
    paddingBottom: 8,
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
  headerTitleWrap: { alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  headerSub: { fontSize: 12, marginTop: 2, opacity: 0.85 },
})
