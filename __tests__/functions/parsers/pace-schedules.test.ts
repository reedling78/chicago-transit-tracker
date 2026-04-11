import {
  buildStopSlugMap,
  deriveColor,
  deriveRegion,
  deriveServiceType,
  extractDirections,
  routeSlug,
} from '@functions/lib/parsers/pace-schedules'

describe('deriveServiceType', () => {
  it('classifies Pulse routes by short name suffix', () => {
    expect(deriveServiceType({ route_short_name: 'Milwaukee Pulse', route_long_name: '' })).toBe(
      'pulse',
    )
    expect(deriveServiceType({ route_short_name: 'Dempster Pulse', route_long_name: '' })).toBe(
      'pulse',
    )
  })

  it('classifies express routes by long name', () => {
    expect(
      deriveServiceType({ route_short_name: '755', route_long_name: 'Plainfield-IMD Express' }),
    ).toBe('express')
  })

  it('classifies feeder routes by leading digit 8', () => {
    expect(deriveServiceType({ route_short_name: '890', route_long_name: 'Feeder' })).toBe('feeder')
  })

  it('defaults to local for regular numbered routes', () => {
    expect(deriveServiceType({ route_short_name: '208', route_long_name: 'Golf Road' })).toBe(
      'local',
    )
    expect(deriveServiceType({ route_short_name: '626', route_long_name: 'Evanston CTA' })).toBe(
      'local',
    )
  })
})

describe('deriveRegion', () => {
  it('maps route 208 to north', () => {
    expect(deriveRegion('208')).toBe('north')
  })

  it('maps route 353 to northwest', () => {
    expect(deriveRegion('353')).toBe('northwest')
  })

  it('maps route 423 to west', () => {
    expect(deriveRegion('423')).toBe('west')
  })

  it('maps route 513 to southwest', () => {
    expect(deriveRegion('513')).toBe('southwest')
  })

  it('maps route 633 to south', () => {
    expect(deriveRegion('633')).toBe('south')
  })

  it('maps 9xx routes to heritage', () => {
    expect(deriveRegion('904')).toBe('heritage')
  })

  it('defaults to north for unrecognized patterns', () => {
    expect(deriveRegion('ABC')).toBe('north')
  })

  it('defaults 8xx feeder routes to north', () => {
    expect(deriveRegion('890')).toBe('north')
  })
})

describe('deriveColor', () => {
  it('uses GTFS route_color when populated and not the default', () => {
    expect(
      deriveColor({ shortName: '208', gtfsColor: '336699', gtfsTextColor: 'FFFFFF' }),
    ).toEqual({ color: '#336699', textColor: '#FFFFFF' })
  })

  it('falls back to Pace corporate blue when GTFS color is missing', () => {
    expect(deriveColor({ shortName: '208', gtfsColor: '', gtfsTextColor: '' })).toEqual({
      color: '#005DAA',
      textColor: '#FFFFFF',
    })
  })

  it('hardcodes Milwaukee Pulse to its branded orange', () => {
    expect(
      deriveColor({ shortName: 'Milwaukee Pulse', gtfsColor: '', gtfsTextColor: '' }),
    ).toEqual({ color: '#FF6C0C', textColor: '#FFFFFF' })
  })

  it('hardcodes Dempster Pulse to its branded teal', () => {
    expect(
      deriveColor({ shortName: 'Dempster Pulse', gtfsColor: '', gtfsTextColor: '' }),
    ).toEqual({ color: '#00A3A1', textColor: '#FFFFFF' })
  })
})

describe('routeSlug', () => {
  it('returns the numeric short name as slug', () => {
    expect(routeSlug('208')).toBe('208')
  })

  it('slugifies Pulse route names', () => {
    expect(routeSlug('Milwaukee Pulse')).toBe('milwaukee-pulse')
    expect(routeSlug('Dempster Pulse')).toBe('dempster-pulse')
  })

  it('handles mixed case and punctuation', () => {
    expect(routeSlug('Route 208A')).toBe('route-208a')
  })
})

describe('buildStopSlugMap', () => {
  it('generates unique slugs from stop names', () => {
    const stops = [
      { stop_id: '1001', stop_name: 'Golf Rd & Waukegan Rd' },
      { stop_id: '1002', stop_name: 'Dempster St & Skokie Blvd' },
    ]
    const map = buildStopSlugMap(stops)
    expect(map.get('1001')).toBe('golf-rd-waukegan-rd')
    expect(map.get('1002')).toBe('dempster-st-skokie-blvd')
  })

  it('disambiguates duplicate names with a numeric suffix', () => {
    const stops = [
      { stop_id: '1001', stop_name: 'Main St' },
      { stop_id: '1002', stop_name: 'Main St' },
      { stop_id: '1003', stop_name: 'Main St' },
    ]
    const map = buildStopSlugMap(stops)
    expect(map.get('1001')).toBe('main-st')
    expect(map.get('1002')).toBe('main-st-2')
    expect(map.get('1003')).toBe('main-st-3')
  })
})

describe('extractDirections', () => {
  it('returns the two most common (direction_id, headsign) pairs for a route', () => {
    const trips = [
      { route_id: '208', direction_id: '0', trip_headsign: 'Evanston' },
      { route_id: '208', direction_id: '0', trip_headsign: 'Evanston' },
      { route_id: '208', direction_id: '0', trip_headsign: 'Evanston' },
      { route_id: '208', direction_id: '1', trip_headsign: 'Schaumburg' },
      { route_id: '208', direction_id: '1', trip_headsign: 'Schaumburg' },
      { route_id: '208', direction_id: '0', trip_headsign: 'Skokie' },
    ]

    const directions = extractDirections('208', trips)
    expect(directions).toHaveLength(2)
    expect(directions).toContainEqual({ id: '0', name: 'Evanston' })
    expect(directions).toContainEqual({ id: '1', name: 'Schaumburg' })
  })

  it('handles single-direction routes', () => {
    const trips = [
      { route_id: '999', direction_id: '0', trip_headsign: 'Loop' },
      { route_id: '999', direction_id: '0', trip_headsign: 'Loop' },
    ]
    expect(extractDirections('999', trips)).toEqual([{ id: '0', name: 'Loop' }])
  })

  it('returns empty array when no trips match', () => {
    expect(extractDirections('208', [])).toEqual([])
  })
})
