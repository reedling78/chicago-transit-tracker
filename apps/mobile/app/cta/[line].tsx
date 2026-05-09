import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useLine, useLineStations } from '../../lib/hooks'
import { useTheme } from '../../lib/theme'
import StationTimeline from '../../components/StationTimeline'
import PageHeader from '../../components/PageHeader'
import CTALineIcon from '../../components/CTALineIcon'
import FavoriteButton from '../../components/FavoriteButton'
import Footer from '../../components/Footer'

export default function CtaLineDetailScreen() {
  const { line: lineSlug } = useLocalSearchParams<{ line: string }>()
  const { line, loading: lineLoading } = useLine(lineSlug)
  const { stations, loading: stationsLoading } = useLineStations(lineSlug, line?.shortName ?? '')
  const { theme } = useTheme()

  if (lineLoading || !line) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.bg.canvas }]}>
        <ActivityIndicator size="large" color={theme.colors.accent.primary} />
      </View>
    )
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => <FavoriteButton type="line" id={line.slug} />,
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.bg.canvas }]}
        contentContainerStyle={styles.content}
      >
        <PageHeader
          compact
          title={line.name}
          description={line.termini.join(' ↔ ')}
          icon={<CTALineIcon line={line.shortName} size={36} />}
        />
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
        <Footer />
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 16 },
})
