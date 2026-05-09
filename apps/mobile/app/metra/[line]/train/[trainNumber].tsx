import { useMemo } from 'react'
import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { LINE_COLORS } from '@ctt/shared'
import { useMetraTrip } from '../../../../lib/hooks'
import { useTheme } from '../../../../lib/theme'
import type { Theme } from '../../../../lib/theme'
import MetraTripRealtime from '../../../../components/MetraTripRealtime'
import FavoriteButton from '../../../../components/FavoriteButton'

export default function MetraTrainDetailScreen() {
  const { line, trainNumber } = useLocalSearchParams<{ line: string; trainNumber: string }>()
  const lineSlug = line ?? ''
  const train = trainNumber ?? ''
  const { trip, loading } = useMetraTrip(lineSlug, train)
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])

  const colors = trip ? LINE_COLORS[trip.line] : undefined
  const headerBg = colors?.bg ?? theme.colors.bg.canvas
  const headerFg = colors?.text ?? theme.colors.text.primary

  return (
    <>
      <Stack.Screen
        options={{
          headerTransparent: false,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: headerBg },
          headerTitle: () => (
            <View style={styles.headerTitleWrap}>
              <Text
                style={[styles.headerTitle, { color: headerFg }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {train ? `Train ${train}` : 'Train'}
              </Text>
              {trip?.lineName && (
                <Text style={[styles.headerSub, { color: headerFg }]} numberOfLines={1}>
                  {trip.lineName}
                </Text>
              )}
            </View>
          ),
          headerRight: () => <FavoriteButton type="train" id={`${lineSlug}_${train}`} />,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.colors.text.secondary} />
          </View>
        )}
        {!loading && !trip && (
          <View style={styles.center}>
            <Text style={styles.title}>Train not found</Text>
            <Text style={styles.subtitle}>
              We couldn&apos;t find {train} on the {lineSlug.toUpperCase()} line.
            </Text>
          </View>
        )}
        {!loading && trip && <MetraTripRealtime trip={trip} lineSlug={lineSlug} />}
      </ScrollView>
    </>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg.canvas,
    },
    content: {
      paddingTop: theme.space[2],
      paddingBottom: theme.space[2],
    },
    center: {
      flex: 1,
      minHeight: 240,
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.space[6],
    },
    title: {
      color: theme.colors.text.primary,
      fontSize: 22,
      fontWeight: '700',
    },
    subtitle: {
      color: theme.colors.text.secondary,
      fontSize: 14,
      marginTop: theme.space[2],
      textAlign: 'center',
    },
    headerTitleWrap: { alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    headerSub: { fontSize: 12, marginTop: 2, opacity: 0.85 },
  })
}
