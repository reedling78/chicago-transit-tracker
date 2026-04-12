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

  it('classifies Pulse routes by long name when short name is empty', () => {
    expect(
      deriveServiceType({ route_short_name: '', route_long_name: 'Pulse Milwaukee Line' }),
    ).toBe('pulse')
    expect(
      deriveServiceType({ route_short_name: '', route_long_name: 'Pulse Dempster Line' }),
    ).toBe('pulse')
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

  it('uses feed-provided Pulse colors when route_color is populated', () => {
    expect(deriveColor({ shortName: '', gtfsColor: '814C9E', gtfsTextColor: 'FFFFFF' })).toEqual({
      color: '#814C9E',
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
  it('returns one canonical headsign per direction_id, picking the most common', () => {
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

  it('supports 3+ distinct direction_ids for loop or multi-branch routes', () => {
    const trips = [
      { route_id: '999', direction_id: '0', trip_headsign: 'North' },
      { route_id: '999', direction_id: '1', trip_headsign: 'South' },
      { route_id: '999', direction_id: '2', trip_headsign: 'Loop' },
    ]
    expect(extractDirections('999', trips)).toHaveLength(3)
  })

  it('falls back to direction_text when trip_headsign is absent (Pace GTFS)', () => {
    const trips = [
      { route_id: '208', direction_id: '0', direction_text: 'East' },
      { route_id: '208', direction_id: '0', direction_text: 'East' },
      { route_id: '208', direction_id: '1', direction_text: 'West' },
    ]
    const directions = extractDirections('208', trips)
    expect(directions).toHaveLength(2)
    expect(directions).toContainEqual({ id: '0', name: 'East' })
    expect(directions).toContainEqual({ id: '1', name: 'West' })
  })

  it('prefers trip_headsign over direction_text when both are present', () => {
    const trips = [
      { route_id: '208', direction_id: '0', trip_headsign: 'Evanston', direction_text: 'East' },
    ]
    const directions = extractDirections('208', trips)
    expect(directions).toEqual([{ id: '0', name: 'Evanston' }])
  })
})

function makePaceGtfsZip(): AdmZip {
  const zip = new AdmZip()

  zip.addFile(
    'routes.txt',
    Buffer.from(
      `route_id,route_short_name,route_long_name,route_desc,route_color,route_text_color
R208,208,Golf Road,,005DAA,FFFFFF
R_MIL,,Pulse Milwaukee Line,BRT service,814C9E,FFFFFF
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

    const milwaukee = result.routes.get('pulse-milwaukee-line')!
    expect(milwaukee.shortName).toBe('Pulse Milwaukee Line')
    expect(milwaukee.serviceType).toBe('pulse')
    expect(milwaukee.color).toBe('#814C9E')
    expect(milwaukee.region).toBe('northwest')

    const r755 = result.routes.get('755')!
    expect(r755.serviceType).toBe('express')
    expect(r755.region).toBe('southwest')

    expect(result.stops.size).toBe(3)
    const s1 = result.stops.get('golf-rd-waukegan-rd')!
    expect(s1.name).toBe('Golf Rd & Waukegan Rd')
    expect(s1.routes).toContain('208')
    expect(s1.routes).toContain('755')

    expect(result.routeStops.size).toBe(3)
    const route208Stops = result.routeStops.get('208')!
    expect(route208Stops.directions['0']).toHaveLength(2)
    expect(route208Stops.directions['1']).toHaveLength(2)
    expect(result.routeStops.get('pulse-milwaukee-line')!.directions['0']).toHaveLength(1)

    expect(result.schedules.size).toBe(3)
    const s1Schedule = result.schedules.get('golf-rd-waukegan-rd')!
    expect(s1Schedule.routes).toBeDefined()
    expect(s1Schedule.routes['208']).toBeDefined()
    // 06:30:00 → 390 minutes after midnight
    expect(s1Schedule.routes['208'].directions['0'].weekday).toEqual([390])
  })

  it('populates Pulse routes from empty short_name routes using long_name fallback', () => {
    const zip = makePaceGtfsZip()
    const result = parsePaceGtfs(zip)
    expect(result.routes.has('pulse-milwaukee-line')).toBe(true)
    const pulse = result.routes.get('pulse-milwaukee-line')!
    expect(pulse.serviceType).toBe('pulse')
    expect(pulse.region).toBe('northwest')
    expect(pulse.color).toBe('#814C9E')
    expect(pulse.shortName).toBe('Pulse Milwaukee Line')
  })

  it('tolerates missing/empty departure_time without emitting NaN', () => {
    const zip = new AdmZip()
    zip.addFile(
      'routes.txt',
      Buffer.from(
        `route_id,route_short_name,route_long_name,route_desc,route_color,route_text_color
R208,208,Golf Road,,,`,
      ),
    )
    zip.addFile(
      'stops.txt',
      Buffer.from(
        `stop_id,stop_name,stop_lat,stop_lon,wheelchair_boarding
S1,Stop A,42.0,-87.0,1
S2,Stop B,42.1,-87.1,1`,
      ),
    )
    zip.addFile(
      'calendar.txt',
      Buffer.from(
        `service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday
WK,1,1,1,1,1,0,0`,
      ),
    )
    zip.addFile(
      'trips.txt',
      Buffer.from(
        `route_id,service_id,trip_id,trip_headsign,direction_id
R208,WK,T1,Evanston,0`,
      ),
    )
    zip.addFile(
      'stop_times.txt',
      Buffer.from(
        `trip_id,stop_id,stop_sequence,departure_time
T1,S1,1,06:30:00
T1,S2,2,`,
      ),
    )

    const result = parsePaceGtfs(zip)
    const s1 = result.schedules.get('stop-a')!
    const s2 = result.schedules.get('stop-b')!
    expect(s1.routes['208'].directions['0'].weekday).toEqual([390])
    // Empty departure on S2 should produce no entry (not NaN)
    expect(s2.routes['208'].directions['0'].weekday).toEqual([])
    for (const min of s1.routes['208'].directions['0'].weekday) {
      expect(Number.isFinite(min)).toBe(true)
    }
  })

  it('breaks longest-pattern ties deterministically by lexicographically smallest trip_id', () => {
    const zip = new AdmZip()
    zip.addFile(
      'routes.txt',
      Buffer.from(
        `route_id,route_short_name,route_long_name,route_desc,route_color,route_text_color
R208,208,Golf Road,,,`,
      ),
    )
    zip.addFile(
      'stops.txt',
      Buffer.from(
        `stop_id,stop_name,stop_lat,stop_lon,wheelchair_boarding
S1,Alpha,42.0,-87.0,1
S2,Bravo,42.1,-87.1,1
S3,Charlie,42.2,-87.2,1`,
      ),
    )
    zip.addFile(
      'calendar.txt',
      Buffer.from(
        `service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday
WK,1,1,1,1,1,0,0`,
      ),
    )
    // Two trips, same direction, same stop count (2), different trip_ids.
    // Feed them in order B-first so the fix (tie-break on trip_id) must override insertion order.
    zip.addFile(
      'trips.txt',
      Buffer.from(
        `route_id,service_id,trip_id,trip_headsign,direction_id
R208,WK,TB,Dest,0
R208,WK,TA,Dest,0`,
      ),
    )
    zip.addFile(
      'stop_times.txt',
      Buffer.from(
        `trip_id,stop_id,stop_sequence,departure_time
TB,S1,1,06:00:00
TB,S2,2,06:10:00
TA,S1,1,07:00:00
TA,S3,2,07:10:00`,
      ),
    )

    const result = parsePaceGtfs(zip)
    const seq = result.routeStops.get('208')!.directions['0']
    // TA wins the tie → sequence should end at Charlie, not Bravo
    expect(seq.map((s) => s.slug)).toEqual(['alpha', 'charlie'])
  })
})

describe('parsePaceGtfs with Pace-format direction_text', () => {
  it('populates PaceRoute.directions from direction_text when trip_headsign is absent', () => {
    const zip = new AdmZip()
    zip.addFile(
      'routes.txt',
      Buffer.from(
        `route_id,route_short_name,route_long_name,route_desc,route_color,route_text_color
R208,208,Golf Road,,005DAA,FFFFFF`,
      ),
    )
    zip.addFile(
      'stops.txt',
      Buffer.from(
        `stop_id,stop_name,stop_lat,stop_lon,wheelchair_boarding
S1,Golf Rd & Waukegan Rd,42.0586,-87.7972,1
S2,Skokie Blvd & Dempster,42.0401,-87.7336,1`,
      ),
    )
    zip.addFile(
      'calendar.txt',
      Buffer.from(
        `service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday
WK,1,1,1,1,1,0,0`,
      ),
    )
    // Pace's real trips.txt layout: direction_text instead of trip_headsign
    zip.addFile(
      'trips.txt',
      Buffer.from(
        `route_id,service_id,trip_id,direction_id,block_id,bikes_allowed,direction_text,wheelchair_accessible,shape_id
R208,WK,14950796,0,2444561,1,East,1,2080696
R208,WK,14950797,0,2444561,1,East,1,2080696
R208,WK,14950798,1,2444562,1,West,1,2080697`,
      ),
    )
    zip.addFile(
      'stop_times.txt',
      Buffer.from(
        `trip_id,stop_id,stop_sequence,departure_time
14950796,S1,1,06:30:00
14950796,S2,2,06:45:00
14950797,S1,1,07:30:00
14950797,S2,2,07:45:00
14950798,S2,1,08:00:00
14950798,S1,2,08:15:00`,
      ),
    )

    const result = parsePaceGtfs(zip)
    const route208 = result.routes.get('208')!
    expect(route208.directions).toHaveLength(2)
    expect(route208.directions).toContainEqual({ id: '0', name: 'East' })
    expect(route208.directions).toContainEqual({ id: '1', name: 'West' })
  })
})
