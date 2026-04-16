import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, Link, Stack } from 'expo-router'
import { useLine, useLineStations } from '../../lib/hooks'

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
      <View style={styles.container}>
        <View style={[styles.header, { backgroundColor: line.color }]}>
          <Text style={[styles.headerTitle, { color: line.textColor }]}>{line.name}</Text>
          <Text style={[styles.headerSub, { color: line.textColor }]}>
            {line.termini.join(' — ')}
          </Text>
        </View>
        {stationsLoading ? (
          <ActivityIndicator size="large" color={line.color} style={{ marginTop: 24 }} />
        ) : (
          <FlatList
            data={stations}
            keyExtractor={(item) => item.slug}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Link href={`/cta/station/${item.slug}`} asChild>
                <Pressable style={styles.stationCard}>
                  <View style={[styles.dot, { backgroundColor: line.color }]} />
                  <View>
                    <Text style={styles.stationName}>{item.name}</Text>
                    <Text style={styles.stationMeta}>{item.municipality}</Text>
                  </View>
                </Pressable>
              </Link>
            )}
          />
        )}
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f23' },
  container: { flex: 1, backgroundColor: '#0f0f23' },
  header: { padding: 24, alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  headerSub: { fontSize: 14, marginTop: 4, opacity: 0.85 },
  list: { padding: 16, gap: 8 },
  stationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 16,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  stationName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  stationMeta: { fontSize: 13, color: '#888', marginTop: 2 },
})
