import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useLine, useLineStations } from '../../../lib/hooks'
import StationTimeline from '../../../components/StationTimeline'
import FavoriteButton from '../../../components/FavoriteButton'

export default function CtaLineDetailScreen() {
  const { line: lineSlug } = useLocalSearchParams<{ line: string }>()
  const { line, loading: lineLoading } = useLine(lineSlug)
  const { stations, loading: stationsLoading } = useLineStations(lineSlug, line?.shortName ?? '')

  if (lineLoading || !line) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00a1de" />
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
              <Text style={[styles.headerTitle, { color: line.textColor }]}>{line.name}</Text>
              <Text style={[styles.headerSub, { color: line.textColor }]}>
                {line.termini.join(' — ')}
              </Text>
            </View>
            <FavoriteButton
              type="line"
              id={line.slug}
              color={line.textColor}
              fillColor={line.textColor}
            />
          </View>
        </View>
        {stationsLoading ? (
          <ActivityIndicator size="large" color={line.color} style={{ marginTop: 24 }} />
        ) : (
          <StationTimeline
            stations={stations}
            lineColor={line.color}
            stationHrefPrefix="/(tabs)/cta/station"
            currentLine={line.shortName}
          />
        )}
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f23' },
  container: { flex: 1, backgroundColor: '#0f0f23' },
  header: { padding: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  headerSub: { fontSize: 14, marginTop: 4, opacity: 0.85 },
})
