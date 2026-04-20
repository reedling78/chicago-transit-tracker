import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useLine, useLineStations } from '../../lib/hooks'
import StationTimeline from '../../components/StationTimeline'

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
          <Text style={[styles.headerTitle, { color: line.textColor }]}>{line.name}</Text>
          <Text style={[styles.headerSub, { color: line.textColor }]}>
            {line.termini.join(' — ')}
          </Text>
        </View>
        {stationsLoading ? (
          <ActivityIndicator size="large" color={line.color} style={{ marginTop: 24 }} />
        ) : (
          <StationTimeline
            stations={stations}
            lineColor={line.color}
            stationHrefPrefix="/cta/station"
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
  header: { padding: 24, alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  headerSub: { fontSize: 14, marginTop: 4, opacity: 0.85 },
})
