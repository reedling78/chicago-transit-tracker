import { type ReactNode } from 'react'
import { View, StyleSheet, Pressable, type ViewStyle } from 'react-native'
import { Link } from 'expo-router'

export type StepStatus = 'default' | 'past' | 'current' | 'skipped'
export type StepBullet = 'open' | 'filled'

export interface StepsItemProps {
  status?: StepStatus
  bullet?: StepBullet
  href?: string
  /** Right-aligned content alongside children. Must not be interactive when `href` is set (nested in a Link). */
  trailing?: ReactNode
  /** Content rendered below `children` in the same column. Must not be interactive when `href` is set. */
  below?: ReactNode
  children: ReactNode
  /** Test hook (e.g. data-stop-sequence equivalent). */
  testID?: string
}

// Internal props injected by <Steps>. Not part of the public API.
interface InternalStepsItemProps extends StepsItemProps {
  _color?: string
  _isFirst?: boolean
  _isLast?: boolean
}

function hexWithAlpha(hex: string, alpha: number): string {
  // Expects '#rrggbb'.
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function StepsItem({
  status = 'default',
  bullet = 'open',
  href,
  trailing,
  below,
  children,
  testID,
  _color,
  _isFirst,
  _isLast,
}: InternalStepsItemProps) {
  const color = _color ?? '#9ca3af'
  const railColor = color
  const topColor = _isFirst ? 'transparent' : railColor
  const bottomColor = _isLast ? 'transparent' : railColor

  const isCurrent = status === 'current'
  const variant: StepBullet | 'halo' = isCurrent ? 'halo' : bullet

  // Pass a single flat style object rather than an array — Pressable inside
  // expo-router's Link asChild reliably picks up object styles but can drop
  // array-shaped style props (the working StationTimeline uses the same pattern).
  const rowStyle: ViewStyle = { ...styles.row }
  if (status === 'past' || status === 'skipped') rowStyle.opacity = 0.6
  if (isCurrent) rowStyle.backgroundColor = hexWithAlpha(color, 0.08)

  const dotColumn = (
    <View style={styles.dotColumn}>
      <View testID="steps-rail-top" style={[styles.lineSegment, { backgroundColor: topColor }]} />
      {variant === 'halo' && (
        <View
          testID="steps-bullet-halo"
          style={[styles.bulletHaloOuter, { backgroundColor: hexWithAlpha(color, 0.3) }]}
        >
          <View style={[styles.bulletHaloInner, { backgroundColor: color }]} />
        </View>
      )}
      {variant === 'filled' && (
        <View
          testID="steps-bullet-filled"
          style={[styles.bulletFilled, { backgroundColor: color, borderColor: color }]}
        />
      )}
      {variant === 'open' && (
        <View testID="steps-bullet-open" style={[styles.bulletOpen, { borderColor: color }]} />
      )}
      <View
        testID="steps-rail-bottom"
        style={[styles.lineSegment, { backgroundColor: bottomColor }]}
      />
    </View>
  )

  const content = (
    <View style={styles.contentColumn}>
      <View style={styles.contentRow}>
        <View testID="steps-left" style={styles.left}>
          {children}
        </View>
        {trailing != null && <View style={styles.trailing}>{trailing}</View>}
      </View>
      {below != null && <View style={styles.below}>{below}</View>}
    </View>
  )

  if (href != null) {
    return (
      <Link href={href as never} asChild>
        <Pressable testID={testID ?? undefined} style={rowStyle}>
          {dotColumn}
          {content}
        </Pressable>
      </Link>
    )
  }

  return (
    <View testID={testID ?? undefined} style={rowStyle}>
      {dotColumn}
      {content}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1a1a2e',
  },
  dotColumn: {
    width: 24,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  lineSegment: {
    width: 3,
    flex: 1,
    minHeight: 12,
    borderRadius: 1.5,
  },
  bulletOpen: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    backgroundColor: '#0f0f23',
  },
  bulletFilled: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  bulletHaloOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletHaloInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  contentColumn: {
    flex: 1,
    paddingVertical: 12,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  left: {
    flex: 1,
    minWidth: 0,
  },
  trailing: {
    flexShrink: 0,
  },
  below: {
    marginTop: 6,
  },
})
