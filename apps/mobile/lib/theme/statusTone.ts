import type { StatusTone } from '@ctt/shared'
import type { Theme } from './tokens'

/**
 * Map a realtime status tone to theme-aware colors. Shared by the trip-detail
 * hero card and the line-level Current service list so both stay consistent.
 */
export function tonePalette(tone: StatusTone, theme: Theme): { text: string; dot: string } {
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
