/**
 * Shared constants and mapping tables.
 *
 * Centralizes data that was previously duplicated across components:
 * line colors, human-readable line names, and the route-id / slug lookups
 * used by the CTA and Metra alert feeds.
 */

// ---------------------------------------------------------------------------
// CTA 'L' route colors — Appendix A of the CTA Branding Guide.
// fg is the icon/foreground color: white on dark lines, near-black on Yellow.
// ---------------------------------------------------------------------------

export const CTA_LINE_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  Red: { bg: '#c60c30', fg: '#ffffff', label: 'Red Line' },
  Blue: { bg: '#00a1de', fg: '#ffffff', label: 'Blue Line' },
  Brown: { bg: '#62361b', fg: '#ffffff', label: 'Brown Line' },
  Green: { bg: '#009b3a', fg: '#ffffff', label: 'Green Line' },
  Orange: { bg: '#f9461c', fg: '#ffffff', label: 'Orange Line' },
  Purple: { bg: '#522398', fg: '#ffffff', label: 'Purple Line' },
  Pink: { bg: '#e27ea6', fg: '#ffffff', label: 'Pink Line' },
  Yellow: { bg: '#f9e300', fg: '#1a1a1a', label: 'Yellow Line' },
}

// ---------------------------------------------------------------------------
// Combined line colors — CTA colors from the official branding guide,
// plus Metra line colors. Used for line chips and alert borders across
// station/line/alerts pages.
// ---------------------------------------------------------------------------

export const LINE_COLORS: Record<string, { bg: string; text: string }> = {
  // CTA lines — sourced from CTA_LINE_COLORS (official branding guide colors)
  ...Object.fromEntries(
    Object.entries(CTA_LINE_COLORS).map(([name, { bg, fg }]) => [name, { bg, text: fg }]),
  ),
  // Metra lines
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

// ---------------------------------------------------------------------------
// Metra line route-id → human name. Used to label alerts and chip tooltips.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Metra route-id → Firestore line slug. Maps the realtime feed's routeId
// (e.g. "MD-W") to the line slug used in URLs (e.g. "md-w").
// ---------------------------------------------------------------------------

export const METRA_ROUTE_ID_TO_LINE_SLUG: Record<string, string> = {
  BNSF: 'bnsf',
  'UP-N': 'up-n',
  'UP-NW': 'up-nw',
  'UP-W': 'up-w',
  'MD-N': 'md-n',
  'MD-W': 'md-w',
  RI: 'ri',
  SWS: 'sws',
  HC: 'hc',
  ME: 'me',
  NCS: 'ncs',
}

// ---------------------------------------------------------------------------
// CTA alert feed route-id maps. The CTA Customer Alerts API uses short
// route ids (e.g. "Red", "Brn", "Org") that are different from the line
// slug used in URLs.
// ---------------------------------------------------------------------------

export const CTA_SLUG_TO_ROUTE_ID: Record<string, string> = {
  red: 'Red',
  blue: 'Blue',
  brown: 'Brn',
  green: 'G',
  orange: 'Org',
  purple: 'P',
  pink: 'Pink',
  yellow: 'Y',
}

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
