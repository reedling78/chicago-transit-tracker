import { useMemo } from 'react'
import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { shortenStationName } from '@ctt/shared'
import { useMetraTrip } from '../../../../../lib/hooks'
import { useTheme } from '../../../../../lib/theme'
import type { Theme } from '../../../../../lib/theme'
import MetraTripRealtime from '../../../../../components/MetraTripRealtime'
import PageHeader from '../../../../../components/PageHeader'
import HeaderMenuButton from '../../../../../components/HeaderMenuButton'
import { headerRightItem } from '../../../../../lib/headerItems'
import { useTrackOpenedOnce } from '../../../../../lib/useTrackOpenedOnce'

const metraHeroImage = require('../../../../../assets/hero-header-metra.jpg')

export default function MetraTrainDetailScreen() {
  const { line, trainNumber } = useLocalSearchParams<{ line: string; trainNumber: string }>()
  const lineSlug = line ?? ''
  const train = trainNumber ?? ''
  const { trip, loading } = useMetraTrip(lineSlug, train)
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])

  useTrackOpenedOnce(trip, 'train_opened', () => ({
    line_id: lineSlug,
    train_number: trip!.trainNumber ?? train,
  }))

  // Mirror the dashboard TrainCard: title is "{origin} to {destination}",
  // subtitle is "{line} #{trainNumber}". Falls back to "Train {n}" until trip
  // data loads.
  const firstStop = trip?.stops?.[0]
  const lastStop = trip?.stops?.[trip.stops.length - 1]
  const heroTitle =
    trip && firstStop && lastStop
      ? `${shortenStationName(firstStop.stationName)} to ${shortenStationName(lastStop.stationName)}`
      : train
        ? `Train ${train}`
        : 'Train'
  const heroSubtitle = trip
    ? `${trip.line ? `${trip.line} ` : ''}#${trip.trainNumber ?? train}`
    : undefined

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: heroTitle,
          ...headerRightItem(<HeaderMenuButton />),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <PageHeader
          compact
          title={heroTitle}
          description={heroSubtitle}
          imageSrc={metraHeroImage}
          dashboardItem={
            lineSlug && train ? { type: 'train', id: `${lineSlug}_${train}` } : undefined
          }
        />
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
      paddingHorizontal: theme.space[4],
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
  })
}
