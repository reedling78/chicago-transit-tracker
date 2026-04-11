/**
 * Pace GTFS schedule parser.
 *
 * Reads a downloaded Pace GTFS zip and emits maps of Firestore documents
 * for pace-routes, pace-stops, pace-route-stops, and pace-schedules.
 */

export type PaceRouteServiceType = 'pulse' | 'local' | 'express' | 'feeder'

export type PaceRegion = 'north' | 'northwest' | 'west' | 'southwest' | 'south' | 'heritage'

interface GtfsRouteRow {
  route_short_name: string
  route_long_name: string
}

/** Classify a Pace route's service type from its GTFS row. */
export function deriveServiceType(row: GtfsRouteRow): PaceRouteServiceType {
  const short = row.route_short_name?.trim() ?? ''
  const long = row.route_long_name?.trim() ?? ''

  if (/\bpulse\b/i.test(short)) return 'pulse'
  if (/express/i.test(long)) return 'express'
  if (/^8\d{2}$/.test(short)) return 'feeder'
  return 'local'
}

/**
 * Region override map. Populate this with route short names whose digit-based
 * region assignment is incorrect. Empty by default in v1; we'll add entries
 * as we identify miscategorizations after the first real sync.
 */
const REGION_OVERRIDES: Record<string, PaceRegion> = {
  // Example: '890': 'north',
}

/** Classify a Pace route's region from its short name. */
export function deriveRegion(shortName: string): PaceRegion {
  const trimmed = shortName.trim()
  if (REGION_OVERRIDES[trimmed]) return REGION_OVERRIDES[trimmed]

  const firstDigit = trimmed.match(/^\d/)?.[0]
  switch (firstDigit) {
    case '2':
      return 'north'
    case '3':
      return 'northwest'
    case '4':
      return 'west'
    case '5':
    case '7':
      return 'southwest'
    case '6':
      return 'south'
    case '8':
      // Feeder routes: default to north (parent division) unless overridden above.
      return 'north'
    case '9':
      return 'heritage'
    default:
      return 'north'
  }
}

const PACE_CORPORATE_BLUE = '#005DAA'
const DEFAULT_TEXT_COLOR = '#FFFFFF'

/** Branded colors for known Pulse routes — overrides GTFS. */
const PULSE_COLORS: Record<string, { color: string; textColor: string }> = {
  'Milwaukee Pulse': { color: '#FF6C0C', textColor: '#FFFFFF' },
  'Dempster Pulse': { color: '#00A3A1', textColor: '#FFFFFF' },
}

interface DeriveColorInput {
  shortName: string
  gtfsColor: string
  gtfsTextColor: string
}

/** Compute the route's display color and text color. */
export function deriveColor(input: DeriveColorInput): { color: string; textColor: string } {
  const override = PULSE_COLORS[input.shortName.trim()]
  if (override) return override

  const raw = input.gtfsColor?.trim() ?? ''
  if (raw && raw.toUpperCase() !== '005DAA') {
    return {
      color: `#${raw.toUpperCase()}`,
      textColor: input.gtfsTextColor
        ? `#${input.gtfsTextColor.toUpperCase()}`
        : DEFAULT_TEXT_COLOR,
    }
  }

  return { color: PACE_CORPORATE_BLUE, textColor: DEFAULT_TEXT_COLOR }
}
