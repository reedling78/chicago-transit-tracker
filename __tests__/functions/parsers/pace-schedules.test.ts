import {
  deriveColor,
  deriveRegion,
  deriveServiceType,
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
