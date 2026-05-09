import { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import Svg, { Circle, Path } from 'react-native-svg'
import type { Station } from '@ctt/shared'
import { LINE_COLORS } from '@ctt/shared'
import { useTheme } from '../lib/theme'
import type { Theme } from '../lib/theme'
import PressableButton from './PressableButton'

interface StationTimelineProps {
  stations: Station[]
  lineColor: string
  stationHrefPrefix: string
  /** Short name of the current line — excluded from transfer chips */
  currentLine: string
}

function WheelchairIcon({ color }: { color: string }) {
  return (
    <Svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill={color}
      accessibilityLabel="ADA Accessible"
    >
      <Circle cx={12} cy={4} r={2} />
      <Path d="M10 7.5a2 2 0 0 0-2 2V14l-2.5 4.5A1 1 0 0 0 6.4 20h.2a1 1 0 0 0 .88-.52L10 15h2v4a1 1 0 0 0 2 0v-4.5A1.5 1.5 0 0 0 12.5 13H11V9.5H14a1 1 0 0 0 0-2h-4z" />
    </Svg>
  )
}

export default function StationTimeline({
  stations,
  lineColor,
  stationHrefPrefix,
  currentLine,
}: StationTimelineProps) {
  const router = useRouter()
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])

  return (
    <View style={styles.container}>
      {stations.map((station, index) => {
        const otherLines = station.lines.filter((l) => l !== currentLine)
        const isFirst = index === 0
        const isLast = index === stations.length - 1

        return (
          <PressableButton
            key={station.slug}
            onPress={() => router.push(`${stationHrefPrefix}/${station.slug}` as never)}
            accessibilityRole="link"
            accessibilityLabel={station.name}
            feedback="subtle"
            style={styles.row}
          >
            {/* Dot column — line segments + dot */}
            <View style={styles.dotColumn}>
              <View
                style={[
                  styles.lineSegment,
                  { backgroundColor: isFirst ? 'transparent' : lineColor },
                ]}
              />
              <View
                style={
                  station.terminal
                    ? [styles.dotTerminal, { backgroundColor: lineColor, borderColor: lineColor }]
                    : [styles.dotRegular, { borderColor: lineColor }]
                }
              />
              <View
                style={[
                  styles.lineSegment,
                  { backgroundColor: isLast ? 'transparent' : lineColor },
                ]}
              />
            </View>

            {/* Content */}
            <View style={styles.content}>
              <View style={styles.nameRow}>
                <Text style={styles.stationName}>{station.name}</Text>
                {station.accessibility.ada && (
                  <WheelchairIcon color={theme.colors.accent.primary} />
                )}
              </View>

              {otherLines.length > 0 && (
                <View style={styles.chipRow}>
                  {otherLines.map((line) => {
                    const colors = LINE_COLORS[line]
                    return (
                      <View
                        key={line}
                        style={[
                          styles.chip,
                          colors
                            ? { backgroundColor: colors.bg }
                            : { backgroundColor: theme.colors.border.subtle },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: colors?.text ?? theme.colors.text.secondary },
                          ]}
                        >
                          {line}
                        </Text>
                      </View>
                    )
                  })}
                </View>
              )}
            </View>

            {/* Arrow */}
            <Text style={styles.arrow}>→</Text>
          </PressableButton>
        )
      })}
    </View>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[1],
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[3],
      height: 56,
    },
    dotColumn: { width: 24, alignSelf: 'stretch', alignItems: 'center' },
    lineSegment: { width: 3, flex: 1, minHeight: 12, borderRadius: 1.5 },
    dotTerminal: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
    dotRegular: {
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 2,
      backgroundColor: theme.colors.bg.canvas,
    },
    content: { flex: 1, paddingVertical: theme.space[2] + 2 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    stationName: { fontSize: 15, fontWeight: '600', color: theme.colors.text.primary },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5 },
    chip: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 },
    chipText: { fontSize: 11, fontWeight: '600' },
    arrow: { color: theme.colors.text.muted, fontSize: 16 },
  })
}
