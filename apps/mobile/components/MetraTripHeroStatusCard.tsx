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

function tonePalette(tone: StatusTone, theme: Theme): { text: string; dot: string } {
  switch (tone) {
    case 'ontime':
    case 'early':
      return { text: theme.colors.status.onTime, dot: theme.colors.status.onTime }
    case 'delayed':
      return { text: theme.colors.status.delayed, dot: theme.colors.status.delayed }
    case 'completed':
    case 'nodata':
      return { text: theme.colors.status.neutral, dot: theme.colors.status.neutral }
    case 'scheduled':
      return { text: theme.colors.status.scheduled, dot: theme.colors.status.scheduled }
  }
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
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
  const tone = tonePalette(status.tone, theme)
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

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      marginHorizontal: theme.space[4],
      marginVertical: theme.space[3],
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.bg.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
      borderLeftWidth: 4,
      overflow: 'hidden',
    },
    row: { flexDirection: 'column' },
    panel: { paddingHorizontal: theme.space[4], paddingVertical: theme.space[3] },
    panelDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border.subtle,
    },
    label: {
      color: theme.colors.text.muted,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[2],
      marginTop: theme.space[1],
    },
    dot: { width: 10, height: 10, borderRadius: 5 },
    value: { fontSize: 22, fontWeight: '700' },
    station: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginTop: theme.space[1],
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: theme.space[2],
      marginTop: theme.space[1],
    },
    time: { fontSize: 14, fontWeight: '600', color: theme.colors.text.secondary },
    subtext: { color: theme.colors.text.secondary, fontSize: 12, marginTop: theme.space[1] },
    errorText: {
      color: theme.colors.status.delayed,
      fontSize: 12,
      marginTop: theme.space[1],
    },
  })
}
