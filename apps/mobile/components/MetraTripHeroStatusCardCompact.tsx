import { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import {
  formatClockTime,
  longToNumber,
  shortenStationName,
  type DestinationEta,
  type HeroStatus,
  type RightPanelCopy,
  type StatusTone,
  type VehiclePosition,
} from '@ctt/shared'
import { useTheme } from '../lib/theme'
import type { Theme } from '../lib/theme'

export interface MetraTripHeroStatusCardCompactProps {
  status: HeroStatus
  vehiclePosition: VehiclePosition | null
  nextStop: RightPanelCopy | null
  destination: DestinationEta | null
  lineColor?: string
  lineTextColor?: string
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
 * Live panel for the dashboard TrainCard, mirroring StationCard's expanded
 * layout: a "Service"-style header bar carrying the status + last-reported
 * line, then a line-colored row split into the next stop (left) and the ETA
 * to the user's destination stop (right).
 * Per `.claude/rules/transit-compliance.md`, the "last reported" timestamp is
 * required wherever Metra realtime data is shown.
 */
export default function MetraTripHeroStatusCardCompact({
  status,
  vehiclePosition,
  nextStop,
  destination,
  lineColor,
  lineTextColor,
}: MetraTripHeroStatusCardCompactProps) {
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
  const tone = toneColor(status.tone, theme)
  const timestampSec = vehiclePosition ? longToNumber(vehiclePosition.timestamp) : null
  const lastReported =
    timestampSec != null ? `Last reported ${formatClockTime(new Date(timestampSec * 1000))}` : null
  const rowBg = lineColor ?? '#565a5c'
  const rowText = lineTextColor ?? '#fff'
  const nextDetail = nextStop ? [nextStop.time, nextStop.subtext].filter(Boolean).join(' · ') : ''

  return (
    <View style={styles.card}>
      <View style={styles.headerBar}>
        <Text style={[styles.headerText, { color: tone }]} numberOfLines={1}>
          {status.label}
        </Text>
        {lastReported ? (
          <Text style={styles.headerMeta} numberOfLines={1}>
            {lastReported}
          </Text>
        ) : null}
      </View>
      {(nextStop || destination) && (
        <View style={[styles.row, { backgroundColor: rowBg }]}>
          <View style={styles.rowLeft}>
            {nextStop && (
              <>
                <Text style={styles.rowCaption}>{nextStop.title}</Text>
                <Text style={[styles.rowStation, { color: rowText }]} numberOfLines={1}>
                  {shortenStationName(nextStop.station)}
                </Text>
                {nextDetail ? (
                  <Text style={styles.rowDetail} numberOfLines={1}>
                    {nextDetail}
                  </Text>
                ) : null}
              </>
            )}
          </View>
          {destination && (
            <View style={styles.rowRight}>
              <Text style={styles.rowCaption}>
                Arrives {destination.etaClock}
                {destination.realtime ? '' : ' (est.)'}
              </Text>
              <Text style={[styles.rowStation, { color: rowText }]} numberOfLines={1}>
                {shortenStationName(destination.station)}
              </Text>
              <Text style={[styles.rowMinutes, { color: rowText }]}>{destination.etaLabel}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

function makeStyles(theme: Theme) {
  // Lifts white text off the saturated line-color row so it stays legible on
  // light brand colors (e.g. Metra orange / UP yellow-ish).
  const onColor = {
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  } as const
  return StyleSheet.create({
    // Negative horizontal + bottom margins cancel the parent card's padding
    // (cardStyles.row: paddingHorizontal 14, paddingVertical 12) so this
    // panel runs flush to the outer card edges. Bottom corners match the
    // parent card's radius; top corners stay square so the panel visually
    // anchors to the header above.
    card: {
      marginTop: 2,
      marginHorizontal: -14,
      marginBottom: -theme.space[3],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border.subtle,
      borderBottomLeftRadius: theme.radius.sm + 2,
      borderBottomRightRadius: theme.radius.sm + 2,
      overflow: 'hidden',
    },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 8,
      backgroundColor: theme.colors.border.subtle,
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[2],
    },
    headerText: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
    headerMeta: {
      color: theme.colors.text.secondary,
      fontWeight: '400',
      fontSize: 11,
      textAlign: 'right',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[3],
      minHeight: 44,
    },
    rowLeft: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
    rowRight: { minWidth: 0, alignItems: 'flex-end' },
    rowCaption: { color: 'rgba(255,255,255,0.85)', fontSize: 11, ...onColor },
    rowStation: { fontSize: 15, fontWeight: '700', marginTop: 1, ...onColor },
    rowDetail: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 1, ...onColor },
    rowMinutes: {
      fontSize: 13,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
      marginTop: 1,
      ...onColor,
    },
  })
}
