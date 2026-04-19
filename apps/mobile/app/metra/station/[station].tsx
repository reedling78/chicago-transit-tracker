import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useStation, useSchedule } from '../../../lib/hooks'
import { LINE_COLORS } from '@ctt/shared'
import { ScheduleTable } from '../../../components/ScheduleTable'
import PageHeader from '../../../components/PageHeader'

const metraHeroImage = require('../../../assets/hero-header-metra.jpg')

export default function MetraStationDetailScreen() {
  const { station: stationSlug } = useLocalSearchParams<{ station: string }>()
  const { station, loading: stationLoading } = useStation(stationSlug)
  const { schedule, loading: scheduleLoading } = useSchedule(stationSlug)

  if (stationLoading || !station) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a3d7a" />
      </View>
    )
  }

  return (
    <>
      <Stack.Screen options={{ title: station.name }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <PageHeader
          title={station.name}
          description={station.address}
          imageSrc={station.photoUrl ? { uri: station.photoUrl } : metraHeroImage}
          badges={
            <>
              <Text style={badgeStyles.service}>
                {station.service === 'both' ? 'CTA + Metra' : 'Metra'}
              </Text>
              {station.terminal && <Text style={badgeStyles.terminal}>Terminal</Text>}
              {station.open24Hours && <Text style={badgeStyles.open24}>24 Hours</Text>}
            </>
          }
        >
          <View style={styles.chips}>
            {station.lines.map((line) => {
              const colors = LINE_COLORS[line]
              return (
                <View key={line} style={[styles.chip, { backgroundColor: colors?.bg ?? '#555' }]}>
                  <Text style={[styles.chipText, { color: colors?.text ?? '#fff' }]}>{line}</Text>
                </View>
              )
            })}
          </View>
        </PageHeader>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Info</Text>
          <View style={styles.amenities}>
            {station.accessibility.ada && <Text style={styles.badge}>ADA</Text>}
            {station.parking && <Text style={styles.badge}>Parking</Text>}
          </View>
        </View>

        {!scheduleLoading && schedule && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Schedule</Text>
            <ScheduleTable schedule={schedule} />
          </View>
        )}
      </ScrollView>
    </>
  )
}

const badgeStyles = StyleSheet.create({
  service: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '600',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  terminal: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '600',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  open24: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '600',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
  },
})

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f23' },
  container: { flex: 1, backgroundColor: '#0f0f23' },
  contentContainer: { padding: 16, gap: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4 },
  chipText: { fontSize: 13, fontWeight: '600' },
  section: { paddingBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: {
    backgroundColor: '#1a1a2e',
    color: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 13,
    overflow: 'hidden',
  },
})
