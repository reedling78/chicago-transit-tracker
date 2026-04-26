import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useLine, useLineStations } from '../../../../lib/hooks'
import StationTimeline from '../../../../components/StationTimeline'
import FavoriteButton from '../../../../components/FavoriteButton'

export default function MetraLineDetailScreen() {
  const { line: lineSlug } = useLocalSearchParams<{ line: string }>()
  const { line, loading: lineLoading } = useLine(lineSlug)
  const { stations, loading: stationsLoading } = useLineStations(lineSlug, line?.shortName ?? '')

  if (lineLoading || !line) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a3d7a" />
      </View>
    )
  }

  return (
    <>
      <Stack.Screen options={{ title: line.name }} />
      <ScrollView style={styles.container}>
        <View style={[styles.header, { backgroundColor: line.color }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>{line.name}</Text>
              <Text style={styles.headerSub}>{line.termini.join(' — ')}</Text>
            </View>
            <FavoriteButton type="line" id={line.slug} />
          </View>
        </View>
        {stationsLoading ? (
          <ActivityIndicator size="large" color={line.color} style={{ marginTop: 24 }} />
        ) : (
          <StationTimeline
            stations={stations}
            lineColor={line.color}
            stationHrefPrefix="/(tabs)/metra/station"
            currentLine={line.shortName}
          />
        )}
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1e' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f0f1e' },
  header: { padding: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  headerSub: { color: '#fff', opacity: 0.9, marginTop: 4 },
})
