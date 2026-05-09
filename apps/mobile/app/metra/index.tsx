import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { useLines } from '../../lib/hooks'
import { LINE_COLORS } from '@ctt/shared'
import { useTheme } from '../../lib/theme'
import LineListItem from '../../components/LineListItem'
import AlertBanner from '../../components/AlertBanner'
import PageHeader from '../../components/PageHeader'
import Footer from '../../components/Footer'

export default function MetraLinesScreen() {
  const { lines, loading } = useLines('metra')
  const { theme } = useTheme()

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.bg.canvas }]}>
        <ActivityIndicator size="large" color={theme.colors.accent.primary} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg.canvas }]}>
      <FlatList
        data={lines}
        keyExtractor={(item) => item.slug}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <PageHeader
              compact
              title="Metra Lines"
              description="11 commuter rail lines connecting Chicago to the suburbs across 6 counties."
              imageSrc={require('../../assets/hero-header-metra.jpg')}
            />
            <AlertBanner service="metra" href="/metra/alerts" />
          </>
        }
        ListFooterComponent={<Footer />}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
})
