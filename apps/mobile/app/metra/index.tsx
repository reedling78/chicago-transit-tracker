import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { useLines } from '../../lib/hooks'
import { LINE_COLORS } from '@ctt/shared'
import LineListItem from '../../components/LineListItem'

export default function MetraLinesScreen() {
  const { lines, loading } = useLines('metra')

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a3d7a" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={lines}
        keyExtractor={(item) => item.slug}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const accentColor = LINE_COLORS[item.shortName]?.bg ?? item.color
          return (
            <LineListItem
              href={`/metra/${item.slug}`}
              title={item.name}
              subtitle={item.termini.join(' — ')}
              accentColor={accentColor}
            />
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f23' },
  container: { flex: 1, backgroundColor: '#0f0f23' },
  list: { padding: 16, gap: 12 },
})
