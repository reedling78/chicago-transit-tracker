import { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { DerivedStop } from '@ctt/shared'
import { useTheme } from '../lib/theme'
import type { Theme } from '../lib/theme'
import { Steps } from './Steps'
import type { StepStatus } from './Steps'

interface Props {
  derivedStops: DerivedStop[]
  lineColor: string
  lineSlug: string
}

function StopMeta({
  status,
  skipped,
  time,
  delayMinutes,
  styles,
}: {
  status: DerivedStop['status']
  skipped: boolean
  time: string
  delayMinutes: number | null
  styles: ReturnType<typeof makeStyles>
}) {
  return (
    <View style={styles.meta}>
      {skipped && (
        <View style={[styles.pill, styles.pillSkipped]}>
          <Text style={styles.pillSkippedText}>Skipped</Text>
        </View>
      )}
      {!skipped && status === 'current' && (
        <View style={[styles.pill, styles.pillNext]}>
          <Text style={styles.pillNextText}>Next stop</Text>
        </View>
      )}
      <Text style={styles.time}>{time}</Text>
      {!skipped && delayMinutes != null && delayMinutes > 0 && (
        <View style={[styles.chip, styles.chipDelayed]}>
          <Text style={styles.chipDelayedText}>+{delayMinutes} min</Text>
        </View>
      )}
      {!skipped && delayMinutes != null && delayMinutes < 0 && (
        <View style={[styles.chip, styles.chipEarly]}>
          <Text style={styles.chipEarlyText}>{delayMinutes} min</Text>
        </View>
      )}
    </View>
  )
}

function mapStatus(raw: DerivedStop['status'], skipped: boolean): StepStatus {
  if (skipped) return 'skipped'
  if (raw === 'past') return 'past'
  if (raw === 'current') return 'current'
  return 'default'
}

export default function MetraTripStopTimeline({ derivedStops, lineColor }: Props) {
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
  return (
    <Steps color={lineColor} style={styles.container}>
      {derivedStops.map((derived) => {
        const { stop, status, delayMinutes, skipped } = derived
        const mappedStatus = mapStatus(status, skipped)
        const href = stop.slug ? `/metra/station/${stop.slug}` : undefined
        return (
          <Steps.Item
            key={stop.sequence}
            testID={`stop-${stop.sequence}`}
            status={mappedStatus}
            href={href}
            trailing={
              <StopMeta
                status={status}
                skipped={skipped}
                time={stop.departure}
                delayMinutes={delayMinutes}
                styles={styles}
              />
            }
          >
            <Text
              style={[styles.stationName, skipped && styles.stationNameSkipped]}
              testID={`stop-name-${stop.sequence}`}
            >
              {stop.stationName}
            </Text>
          </Steps.Item>
        )
      })}
    </Steps>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { paddingHorizontal: theme.space[4] },
    stationName: { color: theme.colors.text.primary, fontSize: 15, fontWeight: '600' },
    stationNameSkipped: { textDecorationLine: 'line-through' },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    pill: {
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.space[2],
      paddingVertical: 2,
    },
    pillSkipped: { backgroundColor: theme.colors.border.subtle },
    pillSkippedText: { color: theme.colors.text.secondary, fontSize: 11, fontWeight: '600' },
    pillNext: { backgroundColor: '#1e3a8a' },
    pillNextText: { color: '#bfdbfe', fontSize: 11, fontWeight: '600' },
    time: {
      color: theme.colors.text.primary,
      fontSize: 13,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
    chip: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
    chipDelayed: { backgroundColor: '#7f1d1d' },
    chipDelayedText: { color: '#fecaca', fontSize: 10, fontWeight: '700' },
    chipEarly: { backgroundColor: '#14532d' },
    chipEarlyText: { color: '#bbf7d0', fontSize: 10, fontWeight: '700' },
  })
}
