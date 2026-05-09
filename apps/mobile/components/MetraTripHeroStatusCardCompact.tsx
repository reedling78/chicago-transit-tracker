import { useMemo } from 'react'
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
import { useTheme } from '../lib/theme'
import type { Theme } from '../lib/theme'

export interface MetraTripHeroStatusCardCompactProps {
  status: HeroStatus
  phase: TripPhase
  currentDerived: DerivedStop | undefined
  firstStop: TripStop | undefined
  lastStop: TripStop | undefined
  vehiclePosition: VehiclePosition | null
  nowMs: number
}

function toneColor(tone: StatusTone, theme: Theme): string {
  switch (tone) {
    case 'ontime':
    case 'early':
      return theme.colors.status.onTime
    case 'delayed':
      return theme.colors.status.delayed
    case 'scheduled':
      return theme.colors.status.scheduled
    case 'completed':
    case 'nodata':
      return theme.colors.status.neutral
  }
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
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
  const tone = toneColor(status.tone, theme)
  const rightPanel = computeRightPanel(phase, currentDerived, firstStop, lastStop, nowMs)
  const timestampSec = vehiclePosition ? longToNumber(vehiclePosition.timestamp) : null
  const lastReported =
    timestampSec != null ? `Last reported ${formatClockTime(new Date(timestampSec * 1000))}` : null

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: tone }]} />
        <Text style={[styles.label, { color: tone }]}>{status.label}</Text>
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

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    // Negative horizontal + bottom margins cancel the parent card's padding
    // (cardStyles.row: paddingHorizontal 14, paddingVertical 12) so this
    // panel runs flush to the outer card edges. Bottom corners match the
    // parent card's radius; top corners stay square so the panel visually
    // anchors to the pill row above.
    card: {
      marginTop: theme.space[3],
      marginHorizontal: -14,
      marginBottom: -theme.space[3],
      paddingHorizontal: 14,
      paddingVertical: theme.space[2] + 2,
      borderBottomLeftRadius: theme.radius.sm + 2,
      borderBottomRightRadius: theme.radius.sm + 2,
      backgroundColor: theme.colors.bg.elevated,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    dot: { width: 8, height: 8, borderRadius: 4 },
    label: { fontSize: 12, fontWeight: '700' },
    divider: { color: theme.colors.text.muted, fontSize: 12 },
    station: { color: theme.colors.text.secondary, fontSize: 12, flexShrink: 1 },
    time: {
      color: theme.colors.text.secondary,
      fontSize: 12,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
    lastReported: { color: theme.colors.text.secondary, fontSize: 10, marginTop: 2 },
  })
}
