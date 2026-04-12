import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useStation, useSchedule } from '../../../lib/hooks'
import { LINE_COLORS } from '@ctt/shared'
import { ScheduleTable } from '../../../components/ScheduleTable'

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
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.name}>{station.name}</Text>
          <Text style={styles.address}>{station.address}</Text>
          <View style={styles.chips}>
            {station.lines.map((line) => {
              const colors = LINE_COLORS[line]
              return (
                <View
                  key={line}
                  style={[styles.chip, { backgroundColor: colors?.bg ?? '#555' }]}
                >
                  <Text style={[styles.chipText, { color: colors?.text ?? '#fff' }]}>
                    {line}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>

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

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f23' },
  container: { flex: 1, backgroundColor: '#0f0f23' },
  header: { padding: 24 },
  name: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  address: { fontSize: 14, color: '#888', marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4 },
  chipText: { fontSize: 13, fontWeight: '600' },
  section: { paddingHorizontal: 24, paddingBottom: 24 },
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
