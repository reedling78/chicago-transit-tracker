import AdmZip from 'adm-zip'
import {
  buildStopSlugMap,
  deriveColor,
  deriveRegion,
  deriveServiceType,
  extractDirections,
  parsePaceGtfs,
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
    expect(deriveColor({ shortName: '208', gtfsColor: '336699', gtfsTextColor: 'FFFFFF' })).toEqual(
      { color: '#336699', textColor: '#FFFFFF' },
    )
  })

  it('falls back to Pace corporate blue when GTFS color is missing', () => {
    expect(deriveColor({ shortName: '208', gtfsColor: '', gtfsTextColor: '' })).toEqual({
      color: '#005DAA',
      textColor: '#FFFFFF',
    })
  })

  it('hardcodes Milwaukee Pulse to its branded orange', () => {
    expect(deriveColor({ shortName: 'Milwaukee Pulse', gtfsColor: '', gtfsTextColor: '' })).toEqual(
      { color: '#FF6C0C', textColor: '#FFFFFF' },
    )
  })

  it('hardcodes Dempster Pulse to its branded teal', () => {
    expect(deriveColor({ shortName: 'Dempster Pulse', gtfsColor: '', gtfsTextColor: '' })).toEqual({
      color: '#00A3A1',
      textColor: '#FFFFFF',
    })
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

function makePaceGtfsZip(): AdmZip {
  const zip = new AdmZip()

  zip.addFile(
    'routes.txt',
    Buffer.from(
      `route_id,route_short_name,route_long_name,route_desc,route_color,route_text_color
R208,208,Golf Road,,005DAA,FFFFFF
R_MIL,Milwaukee Pulse,Milwaukee Avenue,BRT service,,
R755,755,Plainfield-IMD Express,,,`,
    ),
  )

  zip.addFile(
    'stops.txt',
    Buffer.from(
      `stop_id,stop_name,stop_lat,stop_lon,wheelchair_boarding
S1,Golf Rd & Waukegan Rd,42.0586,-87.7972,1
S2,Skokie Blvd & Dempster,42.0401,-87.7336,1
S3,Milwaukee & Touhy,42.0123,-87.8234,1`,
    ),
  )

  zip.addFile(
    'calendar.txt',
    Buffer.from(
      `service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday
WK,1,1,1,1,1,0,0
SAT,0,0,0,0,0,1,0
SUN,0,0,0,0,0,0,1`,
    ),
  )

  zip.addFile(
    'trips.txt',
    Buffer.from(
      `route_id,service_id,trip_id,trip_headsign,direction_id
R208,WK,T208_1,Evanston,0
R208,WK,T208_2,Schaumburg,1
R_MIL,WK,T_MIL_1,Jefferson Park,0
R755,WK,T755_1,IMD,0`,
    ),
  )

  zip.addFile(
    'stop_times.txt',
    Buffer.from(
      `trip_id,stop_id,stop_sequence,departure_time
T208_1,S1,1,06:30:00
T208_1,S2,2,06:45:00
T208_2,S2,1,07:00:00
T208_2,S1,2,07:15:00
T_MIL_1,S3,1,06:10:00
T755_1,S1,1,08:00:00`,
    ),
  )

  return zip
}

describe('parsePaceGtfs', () => {
  it('parses a minimal Pace GTFS zip into route, stop, route-stop, and schedule maps', () => {
    const zip = makePaceGtfsZip()
    const result = parsePaceGtfs(zip)

    expect(result.routes.size).toBe(3)

    const route208 = result.routes.get('208')!
    expect(route208.shortName).toBe('208')
    expect(route208.longName).toBe('Golf Road')
    expect(route208.serviceType).toBe('local')
    expect(route208.region).toBe('north')
    expect(route208.color).toBe('#005DAA')
    expect(route208.directions).toHaveLength(2)

    const milwaukee = result.routes.get('milwaukee-pulse')!
    expect(milwaukee.serviceType).toBe('pulse')
    expect(milwaukee.color).toBe('#FF6C0C')
    expect(milwaukee.region).toBe('northwest')

    const r755 = result.routes.get('755')!
    expect(r755.serviceType).toBe('express')

    expect(result.stops.size).toBe(3)
    const s1 = result.stops.get('golf-rd-waukegan-rd')!
    expect(s1.name).toBe('Golf Rd & Waukegan Rd')
    expect(s1.routes).toContain('208')
    expect(s1.routes).toContain('755')

    expect(result.routeStops.size).toBe(3)
    const route208Stops = result.routeStops.get('208')!
    expect(route208Stops.directions['0']).toHaveLength(2)
    expect(route208Stops.directions['1']).toHaveLength(2)

    expect(result.schedules.size).toBe(3)
    const s1Schedule = result.schedules.get('golf-rd-waukegan-rd')!
    expect(s1Schedule.routes).toBeDefined()
    expect(s1Schedule.routes['208']).toBeDefined()
  })
})
