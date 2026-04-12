import { View, Text, StyleSheet } from 'react-native'
import type { StationSchedule } from '@ctt/shared'

function formatTime(minutesSinceMidnight: number): string {
  const hours = Math.floor(minutesSinceMidnight / 60)
  const minutes = minutesSinceMidnight % 60
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`
}

interface Props {
  schedule: StationSchedule
}

export function ScheduleTable({ schedule }: Props) {
  if (!schedule.directions || schedule.directions.length === 0) {
    return <Text style={styles.empty}>No schedule data available</Text>
  }

  return (
    <View style={styles.container}>
      {schedule.directions.map((dir, i) => (
        <View key={i} style={styles.direction}>
          <Text style={styles.headsign}>To {dir.headsign}</Text>
          <View style={styles.serviceTypes}>
            {(['weekday', 'saturday', 'sunday'] as const).map((serviceType) => {
              const times = dir[serviceType]
              if (!times || times.length === 0) return null
              return (
                <View key={serviceType} style={styles.serviceBlock}>
                  <Text style={styles.serviceLabel}>
                    {serviceType.charAt(0).toUpperCase() + serviceType.slice(1)}
                  </Text>
                  <View style={styles.timeGrid}>
                    {times.slice(0, 12).map((t, j) => (
                      <Text key={j} style={styles.time}>
                        {formatTime(t)}
                      </Text>
                    ))}
                    {times.length > 12 && (
                      <Text style={styles.more}>+{times.length - 12} more</Text>
                    )}
                  </View>
                </View>
              )
            })}
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 20 },
  direction: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 16,
  },
  headsign: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 12 },
  serviceTypes: { gap: 12 },
  serviceBlock: {},
  serviceLabel: { fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 6 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  time: {
    backgroundColor: '#252540',
    color: '#ddd',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  more: { color: '#666', fontSize: 12, alignSelf: 'center' },
  empty: { color: '#666', fontSize: 14 },
})
