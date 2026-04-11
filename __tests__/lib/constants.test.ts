import {
  CTA_LINE_COLORS,
  LINE_COLORS,
  METRA_LINE_NAMES,
  METRA_ROUTE_ID_TO_LINE_SLUG,
  CTA_SLUG_TO_ROUTE_ID,
  CTA_ROUTE_ID_TO_NAME,
} from '@lib/constants'

const CTA_LINES = ['Red', 'Blue', 'Brown', 'Green', 'Orange', 'Purple', 'Pink', 'Yellow']
const METRA_ROUTES = [
  'BNSF',
  'UP-N',
  'UP-NW',
  'UP-W',
  'MD-N',
  'MD-W',
  'RI',
  'SWS',
  'HC',
  'ME',
  'NCS',
]
const CTA_ALERT_ROUTE_IDS = ['Red', 'Blue', 'Brn', 'G', 'Org', 'P', 'Pink', 'Y']

describe('CTA_LINE_COLORS', () => {
  it('covers all 8 CTA rapid transit lines', () => {
    expect(Object.keys(CTA_LINE_COLORS).sort()).toEqual([...CTA_LINES].sort())
  })

  it('uses the official CTA branding hex values', () => {
    expect(CTA_LINE_COLORS.Red.bg).toBe('#c60c30')
    expect(CTA_LINE_COLORS.Blue.bg).toBe('#00a1de')
    expect(CTA_LINE_COLORS.Brown.bg).toBe('#62361b')
    expect(CTA_LINE_COLORS.Green.bg).toBe('#009b3a')
    expect(CTA_LINE_COLORS.Orange.bg).toBe('#f9461c')
    expect(CTA_LINE_COLORS.Purple.bg).toBe('#522398')
    expect(CTA_LINE_COLORS.Pink.bg).toBe('#e27ea6')
    expect(CTA_LINE_COLORS.Yellow.bg).toBe('#f9e300')
  })

  it('uses dark foreground on Yellow (low-contrast background)', () => {
    expect(CTA_LINE_COLORS.Yellow.fg).toBe('#1a1a1a')
    for (const name of CTA_LINES.filter((n) => n !== 'Yellow')) {
      expect(CTA_LINE_COLORS[name].fg).toBe('#ffffff')
    }
  })
})

describe('LINE_COLORS', () => {
  it('includes every CTA line by short name', () => {
    for (const line of CTA_LINES) {
      expect(LINE_COLORS[line]).toBeDefined()
      expect(LINE_COLORS[line].bg).toBe(CTA_LINE_COLORS[line].bg)
      expect(LINE_COLORS[line].text).toBe(CTA_LINE_COLORS[line].fg)
    }
  })

  it('includes every Metra route id', () => {
    for (const route of METRA_ROUTES) {
      expect(LINE_COLORS[route]).toBeDefined()
      expect(LINE_COLORS[route].bg).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
})

describe('METRA_LINE_NAMES', () => {
  it('covers all 11 Metra lines', () => {
    expect(Object.keys(METRA_LINE_NAMES).sort()).toEqual([...METRA_ROUTES].sort())
  })
})

describe('METRA_ROUTE_ID_TO_LINE_SLUG', () => {
  it('covers all 11 Metra lines and returns URL-safe slugs', () => {
    expect(Object.keys(METRA_ROUTE_ID_TO_LINE_SLUG).sort()).toEqual([...METRA_ROUTES].sort())
    for (const slug of Object.values(METRA_ROUTE_ID_TO_LINE_SLUG)) {
      expect(slug).toMatch(/^[a-z-]+$/)
    }
  })
})

describe('CTA_SLUG_TO_ROUTE_ID / CTA_ROUTE_ID_TO_NAME', () => {
  it('slug map has all 8 CTA lines', () => {
    expect(Object.keys(CTA_SLUG_TO_ROUTE_ID).sort()).toEqual(
      CTA_LINES.map((l) => l.toLowerCase()).sort(),
    )
  })

  it('slug map and name map share the same route id set', () => {
    expect(Object.values(CTA_SLUG_TO_ROUTE_ID).sort()).toEqual([...CTA_ALERT_ROUTE_IDS].sort())
    expect(Object.keys(CTA_ROUTE_ID_TO_NAME).sort()).toEqual([...CTA_ALERT_ROUTE_IDS].sort())
  })
})
