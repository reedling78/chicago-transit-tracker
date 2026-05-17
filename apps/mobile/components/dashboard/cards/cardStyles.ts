import { useMemo } from 'react'
import { StyleSheet } from 'react-native'
import { useTheme } from '../../../lib/theme'
import type { Theme } from '../../../lib/theme'

/**
 * Shared row styling for all dashboard favorite cards. Keeping this in one
 * place prevents drift across StationCard / TrainCard / LineCard.
 */
function makeCardStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.space[3],
      paddingHorizontal: 14,
      backgroundColor: theme.colors.bg.surface,
      borderRadius: theme.radius.sm + 2,
      marginBottom: theme.space[4],
      gap: theme.space[3],
    },
    rowDragging: {
      opacity: 0.7,
      transform: [{ scale: 1.02 }],
    },
    content: {
      flex: 1,
    },
    title: { color: theme.colors.text.primary, fontSize: 15, fontWeight: '600' },
    subtitle: { color: theme.colors.text.secondary, fontSize: 12, marginTop: 2 },
    meta: { color: theme.colors.text.secondary, fontSize: 12 },
    chip: {
      paddingHorizontal: theme.space[2] + 2,
      paddingVertical: theme.space[1],
      borderRadius: theme.radius.full,
    },
    chipText: { fontSize: 12, fontWeight: '700' },
    pillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: theme.space[1] + 2,
      marginTop: theme.space[1],
    },
    pill: {
      paddingHorizontal: theme.space[2],
      paddingVertical: 2,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.border.subtle,
    },
    pillText: { color: theme.colors.text.secondary, fontSize: 11, fontWeight: '500' },
    /** 4px-thick strip painted on the leading edge using the line color. */
    accentBorder: { borderLeftWidth: 4 },
  })
}

export type CardStyles = ReturnType<typeof makeCardStyles>

export function useCardStyles(): CardStyles {
  const { theme } = useTheme()
  return useMemo(() => makeCardStyles(theme), [theme])
}
