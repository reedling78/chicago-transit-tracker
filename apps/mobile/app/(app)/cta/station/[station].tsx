import { useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useStation, useSchedule } from '../../../../lib/hooks'
import { LINE_COLORS } from '@ctt/shared'
import { useTheme } from '../../../../lib/theme'
import type { Theme } from '../../../../lib/theme'
import { ArrivalsCard } from '../../../../components/ArrivalsCard'
import { CTAScheduleTable } from '../../../../components/CTAScheduleTable'
import PageHeader from '../../../../components/PageHeader'
import FavoriteButton from '../../../../components/FavoriteButton'

const ctaHeroImage = require('../../../../assets/hero-header.jpg')

export default function CtaStationDetailScreen() {
  const { station: stationSlug } = useLocalSearchParams<{ station: string }>()
  const { station, loading: stationLoading } = useStation(stationSlug)
  const { schedule, loading: scheduleLoading } = useSchedule(stationSlug)
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
  const badgeStyles = useMemo(() => makeBadgeStyles(theme), [theme])

  if (stationLoading || !station) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.accent.primary} />
      </View>
    )
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: station.name,
          headerRight: () => <FavoriteButton type="station" id={station.slug} />,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <PageHeader
          compact
          title={station.name}
          description={station.address}
          imageSrc={station.photoUrl ? { uri: station.photoUrl } : ctaHeroImage}
          badges={
            <>
              {station.terminal && <Text style={badgeStyles.terminal}>Terminal</Text>}
              {station.open24Hours && <Text style={badgeStyles.open24}>24 Hours</Text>}
            </>
          }
        >
          <View style={styles.chips}>
            {station.lines.map((line) => {
              const colors = LINE_COLORS[line]
              return (
                <View
                  key={line}
                  style={[styles.chip, { backgroundColor: colors?.bg ?? theme.colors.text.muted }]}
                >
                  <Text
                    style={[styles.chipText, { color: colors?.text ?? theme.colors.text.onScrim }]}
                  >
                    {line}
                  </Text>
                </View>
              )
            })}
          </View>
        </PageHeader>

        <ArrivalsCard schedule={schedule} service="cta" loading={scheduleLoading} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.amenities}>
            {station.accessibility.ada && <Text style={styles.badge}>ADA</Text>}
            {station.accessibility.elevator && <Text style={styles.badge}>Elevator</Text>}
            {station.accessibility.escalator && <Text style={styles.badge}>Escalator</Text>}
            {station.parking && <Text style={styles.badge}>Parking</Text>}
          </View>
        </View>

        {!scheduleLoading && schedule && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Schedule</Text>
            <CTAScheduleTable schedule={schedule} />
          </View>
        )}
      </ScrollView>
    </>
  )
}

function makeBadgeStyles(theme: Theme) {
  return StyleSheet.create({
    terminal: {
      backgroundColor: 'rgba(251, 191, 36, 0.15)',
      color: '#fbbf24',
      fontSize: 12,
      fontWeight: '600',
      borderRadius: theme.radius.md,
      paddingHorizontal: 10,
      paddingVertical: 3,
      overflow: 'hidden',
    },
    open24: {
      backgroundColor: 'rgba(34, 197, 94, 0.15)',
      color: theme.colors.status.onTime,
      fontSize: 12,
      fontWeight: '600',
      borderRadius: theme.radius.md,
      paddingHorizontal: 10,
      paddingVertical: 3,
      overflow: 'hidden',
    },
  })
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.bg.canvas,
    },
    container: { flex: 1, backgroundColor: theme.colors.bg.canvas },
    contentContainer: {
      paddingHorizontal: theme.space[4],
      paddingBottom: theme.space[4],
      gap: theme.space[4],
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] },
    chip: {
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.space[3],
      paddingVertical: theme.space[1],
    },
    chipText: { fontSize: 13, fontWeight: '600' },
    section: { paddingBottom: theme.space[2] },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text.primary,
      marginBottom: theme.space[3],
    },
    amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] },
    badge: {
      backgroundColor: theme.colors.bg.surface,
      color: theme.colors.text.secondary,
      borderRadius: theme.radius.sm + 2,
      paddingHorizontal: theme.space[3],
      paddingVertical: theme.space[1],
      fontSize: 13,
      overflow: 'hidden',
    },
    headerTitleWrap: { alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: theme.colors.text.primary, fontSize: 17, fontWeight: '700' },
    headerSub: { color: theme.colors.text.secondary, fontSize: 12, marginTop: 2 },
  })
}
