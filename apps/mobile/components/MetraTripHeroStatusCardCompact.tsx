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

export interface MetraTripHeroStatusCardCompactProps {
  status: HeroStatus
  phase: TripPhase
  currentDerived: DerivedStop | undefined
  firstStop: TripStop | undefined
  lastStop: TripStop | undefined
  vehiclePosition: VehiclePosition | null
  nowMs: number
}

const TONE_COLOR: Record<StatusTone, string> = {
  ontime: '#22c55e',
  delayed: '#ef4444',
  early: '#22c55e',
  completed: '#9ca3af',
  scheduled: '#3b82f6',
  nodata: '#9ca3af',
}

/**
 * One-line variant of MetraTripHeroStatusCard for use inside dashboard cards.
 * Per `.claude/rules/transit-compliance.md`, surfaces showing Metra realtime
 * data must include a "last reported" timestamp.
 */
export default function MetraTripHeroStatusCardCompact({
  status,
  phase,
  currentDerived,
  firstStop,
  lastStop,
  vehiclePosition,
  nowMs,
}: MetraTripHeroStatusCardCompactProps) {
  const toneColor = TONE_COLOR[status.tone]
  const rightPanel = computeRightPanel(phase, currentDerived, firstStop, lastStop, nowMs)
  const timestampSec = vehiclePosition ? longToNumber(vehiclePosition.timestamp) : null
  const lastReported =
    timestampSec != null ? `Last reported ${formatClockTime(new Date(timestampSec * 1000))}` : null

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: toneColor }]} />
        <Text style={[styles.label, { color: toneColor }]}>{status.label}</Text>
        {rightPanel && (
          <>
            <Text style={styles.divider}>·</Text>
            <Text style={styles.station} numberOfLines={1}>
              {rightPanel.title}: {rightPanel.station}
            </Text>
            {rightPanel.time && <Text style={styles.time}>{rightPanel.time}</Text>}
          </>
        )}
      </View>
      {lastReported && <Text style={styles.lastReported}>{lastReported}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  // Negative horizontal + bottom margins cancel the parent card's
  // padding (cardStyles.row: paddingHorizontal 14, paddingVertical 12) so
  // this panel runs flush to the outer card edges. Bottom corners match
  // the parent card's 8px radius; top corners are square so the panel
  // visually anchors to the pill row above.
  card: {
    marginTop: 12,
    marginHorizontal: -14,
    marginBottom: -12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: '#111827',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 12, fontWeight: '700' },
  divider: { color: '#6b7280', fontSize: 12 },
  station: { color: '#e5e7eb', fontSize: 12, flexShrink: 1 },
  time: { color: '#e5e7eb', fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  lastReported: { color: '#9ca3af', fontSize: 10, marginTop: 2 },
})
