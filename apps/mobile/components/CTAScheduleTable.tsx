import { useMemo, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { StationSchedule, ServiceType } from '@ctt/shared'
import { useTheme } from '../lib/theme'
import type { Theme } from '../lib/theme'
import { TimetableFilterBar, todayServiceType } from './TimetableFilterBar'

function formatTime(minutesSinceMidnight: number): string {
  const hours = Math.floor(minutesSinceMidnight / 60)
  const minutes = minutesSinceMidnight % 60
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`
}

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  weekday: 'Weekday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

interface Props {
  schedule: StationSchedule
}

export function CTAScheduleTable({ schedule }: Props) {
  const [serviceType, setServiceType] = useState<ServiceType>(todayServiceType())
  const [activeDirection, setActiveDirection] = useState('all')
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])

  if (!schedule.directions || schedule.directions.length === 0) {
    return <Text style={styles.empty}>No schedule data available</Text>
  }

  const directionOptions = [
    { key: 'all', label: 'All' },
    ...schedule.directions.map((dir, i) => ({
      key: String(i),
      label: dir.headsign,
    })),
  ]

  let rows: { time: number; headsign: string }[] = []
  if (activeDirection === 'all') {
    for (const dir of schedule.directions) {
      const times = dir[serviceType]
      for (const t of times) {
        rows.push({ time: t, headsign: dir.headsign })
      }
    }
    rows.sort((a, b) => a.time - b.time)
  } else {
    const dirIndex = parseInt(activeDirection, 10)
    const dir = schedule.directions[dirIndex]
    if (dir) {
      rows = dir[serviceType].map((t) => ({ time: t, headsign: dir.headsign }))
    }
  }

  return (
    <View>
      <TimetableFilterBar
        directions={directionOptions}
        activeDirection={activeDirection}
        onDirectionChange={setActiveDirection}
        activeServiceType={serviceType}
        onServiceTypeChange={setServiceType}
      />

      {rows.length === 0 ? (
        <Text style={styles.empty}>
          No {SERVICE_TYPE_LABELS[serviceType]} service at this station.
        </Text>
      ) : (
        <View style={styles.list}>
          {rows.map((row, i) => (
            <View key={`${row.time}-${row.headsign}-${i}`} style={styles.row}>
              <Text style={styles.time}>{formatTime(row.time)}</Text>
              <Text style={styles.headsign} numberOfLines={1}>
                To {row.headsign}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    list: {
      borderRadius: theme.radius.sm + 4,
      backgroundColor: theme.colors.bg.surface,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: theme.space[3],
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.subtle,
    },
    time: {
      width: 80,
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    headsign: { flex: 1, fontSize: 14, color: theme.colors.text.secondary },
    empty: { color: theme.colors.text.muted, fontSize: 14 },
  })
}
