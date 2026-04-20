import { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { StationTrips, ServiceType } from '@ctt/shared'
import { TimetableFilterBar, todayServiceType } from './TimetableFilterBar'

type Direction = 'all' | 'inbound' | 'outbound'

const DIRECTION_OPTIONS = [
  { key: 'all' as Direction, label: 'All' },
  { key: 'inbound' as Direction, label: 'Inbound' },
  { key: 'outbound' as Direction, label: 'Outbound' },
]

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  weekday: 'Weekday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

interface Props {
  stationTrips: StationTrips
}

export function MetraTimetable({ stationTrips }: Props) {
  const [serviceType, setServiceType] = useState<ServiceType>(todayServiceType())
  const [direction, setDirection] = useState<Direction>('all')

  const trips = stationTrips[serviceType].filter((t) => {
    if (direction === 'inbound') return t.directionId === 1
    if (direction === 'outbound') return t.directionId === 0
    return true
  })

  return (
    <View>
      <TimetableFilterBar
        directions={DIRECTION_OPTIONS}
        activeDirection={direction}
        onDirectionChange={(key) => setDirection(key as Direction)}
        activeServiceType={serviceType}
        onServiceTypeChange={setServiceType}
      />

      {trips.length === 0 ? (
        <Text style={styles.empty}>
          No {SERVICE_TYPE_LABELS[serviceType]} service at this station.
        </Text>
      ) : (
        <View style={styles.list}>
          {trips.map((trip) => (
            <View key={`${trip.tripId}-${trip.departure}`} style={styles.row}>
              <Text style={styles.time}>{trip.departure}</Text>
              <Text style={styles.headsign} numberOfLines={1}>
                To {trip.headsign}
              </Text>
              <Text style={styles.trainNumber}>Train {trip.trainNumber}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  list: {
    borderRadius: 10,
    backgroundColor: '#1a1a2e',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#252540',
  },
  time: {
    width: 80,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  headsign: {
    flex: 1,
    fontSize: 14,
    color: '#9ca3af',
  },
  trainNumber: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  empty: {
    color: '#666',
    fontSize: 14,
  },
})
