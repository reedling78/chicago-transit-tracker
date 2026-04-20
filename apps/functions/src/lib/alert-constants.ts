/**
 * Alert-related constants for the Cloud Function alert proxies.
 *
 * Source of truth: packages/shared/src/constants.ts
 * Duplicated here because the functions package uses CommonJS and does
 * not consume @ctt/shared directly.
 */

export const RAIL_ROUTE_IDS = new Set(['Red', 'Blue', 'Brn', 'G', 'Org', 'P', 'Pink', 'Y'])

export const CTA_ROUTE_ID_TO_NAME: Record<string, string> = {
  Red: 'Red Line',
  Blue: 'Blue Line',
  Brn: 'Brown Line',
  G: 'Green Line',
  Org: 'Orange Line',
  P: 'Purple Line',
  Pink: 'Pink Line',
  Y: 'Yellow Line',
}

export const METRA_LINE_NAMES: Record<string, string> = {
  BNSF: 'BNSF Railway',
  'UP-N': 'Union Pacific North',
  'UP-NW': 'Union Pacific Northwest',
  'UP-W': 'Union Pacific West',
  'MD-N': 'Milwaukee District North',
  'MD-W': 'Milwaukee District West',
  RI: 'Rock Island',
  SWS: 'SouthWest Service',
  HC: 'Heritage Corridor',
  ME: 'Metra Electric',
  NCS: 'North Central Service',
}

export const METRA_LINE_COLORS: Record<string, { bg: string; text: string }> = {
  BNSF: { bg: '#1A3D7A', text: '#fff' },
  'UP-N': { bg: '#007B40', text: '#fff' },
  'UP-NW': { bg: '#007B40', text: '#fff' },
  'UP-W': { bg: '#007B40', text: '#fff' },
  'MD-N': { bg: '#C8872A', text: '#fff' },
  'MD-W': { bg: '#C8872A', text: '#fff' },
  RI: { bg: '#BE0000', text: '#fff' },
  SWS: { bg: '#7B3F97', text: '#fff' },
  HC: { bg: '#4A7729', text: '#fff' },
  ME: { bg: '#003DA5', text: '#fff' },
  NCS: { bg: '#8B4513', text: '#fff' },
}
