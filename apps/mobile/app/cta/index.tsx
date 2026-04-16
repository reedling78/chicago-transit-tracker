import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { useLines } from '../../lib/hooks'
import { CTA_LINE_COLORS } from '@ctt/shared'
import LineListItem from '../../components/LineListItem'
import CTALineIcon from '../../components/CTALineIcon'

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
    <View style={styles.container}>
      <FlatList
        data={lines}
        keyExtractor={(item) => item.slug}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const accentColor = CTA_LINE_COLORS[item.shortName]?.bg ?? item.color
          return (
            <LineListItem
              href={`/cta/${item.slug}`}
              title={item.name}
              subtitle={item.termini.join(' — ')}
              accentColor={accentColor}
              icon={<CTALineIcon line={item.shortName} size={36} />}
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
