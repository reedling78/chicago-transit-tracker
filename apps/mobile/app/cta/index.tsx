import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { Link } from 'expo-router'
import { useLines } from '../../lib/hooks'
import { CTA_LINE_COLORS } from '@ctt/shared'

export default function CtaLinesScreen() {
  const { lines, loading } = useLines('cta')

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00a1de" />
      </View>
    )
  }

  return (
    <FlatList
      data={lines}
      keyExtractor={(item) => item.slug}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const colors = CTA_LINE_COLORS[item.shortName]
        return (
          <Link href={`/cta/${item.slug}`} asChild>
            <Pressable style={[styles.card, { backgroundColor: colors?.bg ?? item.color }]}>
              <Text style={[styles.cardTitle, { color: colors?.fg ?? '#fff' }]}>{item.name}</Text>
              <Text style={[styles.cardSub, { color: colors?.fg ?? '#fff' }]}>
                {item.stationCount} stations · {item.termini.join(' — ')}
              </Text>
            </Pressable>
          </Link>
        )
      }}
    />
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f23' },
  list: { padding: 16, gap: 12, backgroundColor: '#0f0f23' },
  card: { borderRadius: 12, padding: 20 },
  cardTitle: { fontSize: 20, fontWeight: 'bold' },
  cardSub: { fontSize: 13, marginTop: 4, opacity: 0.85 },
})
