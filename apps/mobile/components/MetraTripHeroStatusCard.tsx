import { View, Text, StyleSheet } from 'react-native'
import {
  computeRightPanel,
  formatClockTime,
  longToNumber,
  type DerivedStop,
  type HeroStatus,
  type StatusTone,
  type TripPhase,
  type TripStop,
  type VehiclePosition,
} from '@ctt/shared'

export interface MetraTripHeroStatusCardProps {
  status: HeroStatus
  phase: TripPhase
  currentDerived: DerivedStop | undefined
  firstStop: TripStop | undefined
  lastStop: TripStop | undefined
  vehiclePosition: VehiclePosition | null
  lineColor: string
  error: string | null
  nowMs: number
}

interface TonePalette {
  text: string
  dot: string
}

const TONE_PALETTE: Record<StatusTone, TonePalette> = {
  ontime: { text: '#22c55e', dot: '#22c55e' },
  delayed: { text: '#ef4444', dot: '#ef4444' },
  early: { text: '#22c55e', dot: '#22c55e' },
  completed: { text: '#9ca3af', dot: '#9ca3af' },
  scheduled: { text: '#3b82f6', dot: '#3b82f6' },
  nodata: { text: '#9ca3af', dot: '#9ca3af' },
}

export default function MetraTripHeroStatusCard({
  status,
  phase,
  currentDerived,
  firstStop,
  lastStop,
  vehiclePosition,
  lineColor,
  error,
  nowMs,
}: MetraTripHeroStatusCardProps) {
  const tone = TONE_PALETTE[status.tone]
  const rightPanel = computeRightPanel(phase, currentDerived, firstStop, lastStop, nowMs)

  const timestampSec = vehiclePosition ? longToNumber(vehiclePosition.timestamp) : null
  const lastReported =
    timestampSec != null ? `Last reported ${formatClockTime(new Date(timestampSec * 1000))}` : null

  return (
    <View style={[styles.card, { borderLeftColor: lineColor }]}>
      <View style={styles.row}>
        <View style={styles.panel}>
          <Text style={styles.label}>Live status</Text>
          <View style={styles.valueRow}>
            <View style={[styles.dot, { backgroundColor: tone.dot }]} />
            <Text style={[styles.value, { color: tone.text }]}>{status.label}</Text>
          </View>
          {lastReported && <Text style={styles.subtext}>{lastReported}</Text>}
          {error && <Text style={styles.errorText}>Live feed error: {error}</Text>}
        </View>

        {rightPanel && (
          <View style={[styles.panel, styles.panelDivider]}>
            <Text style={styles.label}>{rightPanel.title}</Text>
            <Text style={styles.station}>{rightPanel.station}</Text>
            <View style={styles.timeRow}>
              {rightPanel.time && <Text style={styles.time}>{rightPanel.time}</Text>}
              {rightPanel.subtext && <Text style={styles.subtext}>{rightPanel.subtext}</Text>}
            </View>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'column',
  },
  panel: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  panelDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1f2937',
  },
  label: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
  },
  station: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 4,
  },
  time: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  subtext: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
})
