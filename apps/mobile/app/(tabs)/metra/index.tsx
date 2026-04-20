import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { useLines } from '../../../lib/hooks'
import { LINE_COLORS } from '@ctt/shared'
import LineListItem from '../../../components/LineListItem'
import AlertBanner from '../../../components/AlertBanner'
import PageHeader from '../../../components/PageHeader'

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
        ListHeaderComponent={
          <>
            <PageHeader
              title="Metra Lines"
              description="11 commuter rail lines connecting Chicago to the suburbs across 6 counties."
              imageSrc={require('../../../assets/hero-header-metra.jpg')}
            />
            <AlertBanner service="metra" href="/(tabs)/metra/alerts" />
          </>
        }
        renderItem={({ item }) => {
          const accentColor = LINE_COLORS[item.shortName]?.bg ?? item.color
          return (
            <LineListItem
              href={`/(tabs)/metra/${item.slug}`}
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
  list: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
})
