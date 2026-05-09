import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useLine, useLineStations } from '../../lib/hooks'
import { useTheme } from '../../lib/theme'
import StationTimeline from '../../components/StationTimeline'
import FavoriteButton from '../../components/FavoriteButton'

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
          headerTransparent: false,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: line.color },
          headerTitle: () => (
            <View style={styles.headerTitleWrap}>
              <Text
                style={[styles.headerTitle, { color: line.textColor }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {line.name}
              </Text>
              <Text style={[styles.headerSub, { color: line.textColor }]} numberOfLines={1}>
                {line.termini.join(' — ')}
              </Text>
            </View>
          ),
          headerRight: () => (
            <FavoriteButton
              type="line"
              id={line.slug}
              color={line.textColor}
              fillColor={line.textColor}
            />
          ),
        }}
      />
      <ScrollView style={[styles.container, { backgroundColor: theme.colors.bg.canvas }]}>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  headerTitleWrap: { alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  headerSub: { fontSize: 12, marginTop: 2, opacity: 0.85 },
})
