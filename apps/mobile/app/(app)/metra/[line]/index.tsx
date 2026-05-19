import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useLine, useLineStations } from '../../../../lib/hooks'
import { useTheme } from '../../../../lib/theme'
import StationTimeline from '../../../../components/StationTimeline'
import PageHeader from '../../../../components/PageHeader'
import FavoriteButton from '../../../../components/FavoriteButton'

const metraHeroImage = require('../../../../assets/hero-header-metra.jpg')

export default function MetraLineDetailScreen() {
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
          headerTitle: line.name,
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
          imageSrc={metraHeroImage}
        />
        {stationsLoading ? (
          <ActivityIndicator size="large" color={line.color} style={{ marginTop: 24 }} />
        ) : (
          <StationTimeline
            stations={stations}
            lineColor={line.color}
            stationHrefPrefix="/metra/station"
            currentLine={line.shortName}
          />
        )}
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingBottom: 16 },
})
