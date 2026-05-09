import { useMemo, type ReactNode } from 'react'
import { View, StyleSheet, Pressable, type ViewStyle } from 'react-native'
import { Link } from 'expo-router'
import { useTheme } from '../../lib/theme'
import type { Theme } from '../../lib/theme'

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

interface InternalStepsItemProps extends StepsItemProps {
  _color?: string
  _isFirst?: boolean
  _isLast?: boolean
}

function hexWithAlpha(hex: string, alpha: number): string {
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
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
  const color = _color ?? theme.colors.text.secondary
  const railColor = color
  const topColor = _isFirst ? 'transparent' : railColor
  const bottomColor = _isLast ? 'transparent' : railColor

  const isCurrent = status === 'current'
  const variant: StepBullet | 'halo' = isCurrent ? 'halo' : bullet

  const rowStyle: ViewStyle = { ...styles.row }
  if (status === 'past' || status === 'skipped') rowStyle.opacity = 0.6
  if (isCurrent && _color) rowStyle.backgroundColor = hexWithAlpha(_color, 0.08)

  const dotColumn = (
    <View style={styles.dotColumn}>
      <View testID="steps-rail-top" style={[styles.lineSegment, { backgroundColor: topColor }]} />
      {variant === 'halo' && _color && (
        <View
          testID="steps-bullet-halo"
          style={[styles.bulletHaloOuter, { backgroundColor: hexWithAlpha(_color, 0.3) }]}
        >
          <View style={[styles.bulletHaloInner, { backgroundColor: color }]} />
        </View>
      )}
      {variant === 'halo' && !_color && (
        <View
          testID="steps-bullet-halo"
          style={[styles.bulletHaloOuter, { backgroundColor: theme.colors.border.subtle }]}
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

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[3],
      minHeight: 56,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border.subtle,
    },
    dotColumn: { width: 24, alignSelf: 'stretch', alignItems: 'center' },
    lineSegment: { width: 3, flex: 1, minHeight: 12, borderRadius: 1.5 },
    bulletOpen: {
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 2,
      backgroundColor: theme.colors.bg.canvas,
    },
    bulletFilled: { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
    bulletHaloOuter: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bulletHaloInner: { width: 12, height: 12, borderRadius: 6 },
    contentColumn: { flex: 1, paddingVertical: theme.space[3] },
    contentRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.space[3],
    },
    left: { flex: 1, minWidth: 0 },
    trailing: { flexShrink: 0 },
    below: { marginTop: 6 },
  })
}
