import AdmZip from 'adm-zip'
import { parseCtaSchedules } from '@functions/lib/parsers/cta-schedules'

function makeCtaGtfsZip(): AdmZip {
  const zip = new AdmZip()

  // Parent station (location_type=1) and platform (location_type=0)
  zip.addFile(
    'stops.txt',
    Buffer.from(
      `stop_id,stop_name,location_type,parent_station
40380,Clark/Lake,1,
30074,Clark/Lake (Blue Line - O'Hare),0,40380
30075,Clark/Lake (Blue Line - Forest Park),0,40380`,
    ),
  )

  zip.addFile(
    'calendar.txt',
    Buffer.from(
      `service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday
WK,1,1,1,1,1,0,0
SAT,0,0,0,0,0,1,0`,
    ),
  )

  zip.addFile(
    'trips.txt',
    Buffer.from(
      `trip_id,route_id,service_id,trip_headsign
T1,Blue,WK,O'Hare
T2,Blue,SAT,O'Hare`,
    ),
  )

  zip.addFile(
    'stop_times.txt',
    Buffer.from(
      `trip_id,stop_id,stop_sequence,departure_time
T1,30074,1,08:30:00
T2,30074,1,10:00:00`,
    ),
  )

  return zip
}

describe('parseCtaSchedules', () => {
  it('parses a minimal CTA GTFS zip into station schedules', () => {
    const zip = makeCtaGtfsZip()
    const mapIdToSlug = new Map<number, string>([[40380, 'clark-lake']])

    const result = parseCtaSchedules(zip, mapIdToSlug)

    expect(result.size).toBe(1)
    const schedule = result.get('clark-lake')!
    expect(schedule.service).toBe('cta')
    expect(schedule.directions).toHaveLength(1)
    expect(schedule.directions[0].headsign).toBe("O'Hare")
    expect(schedule.directions[0].line).toBe('Blue')
    expect(schedule.directions[0].weekday).toEqual([510]) // 8:30 = 510 min
    expect(schedule.directions[0].saturday).toEqual([600]) // 10:00 = 600 min
  })

  it('skips stations not in the mapIdToSlug lookup', () => {
    const zip = makeCtaGtfsZip()
    const mapIdToSlug = new Map<number, string>() // empty

    const result = parseCtaSchedules(zip, mapIdToSlug)

    expect(result.size).toBe(0)
  })

  it('deduplicates trips per station (same trip, same parent)', () => {
    const zip = new AdmZip()
    zip.addFile(
      'stops.txt',
      Buffer.from(
        `stop_id,stop_name,location_type,parent_station
40380,Clark/Lake,1,
30074,Platform A,0,40380
30076,Platform B,0,40380`,
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
      Buffer.from(`trip_id,route_id,service_id,trip_headsign\nT1,Red,WK,95th/Dan Ryan`),
    )
    // Same trip stops at two platforms in same parent station
    zip.addFile(
      'stop_times.txt',
      Buffer.from(
        `trip_id,stop_id,stop_sequence,departure_time
T1,30074,1,09:00:00
T1,30076,2,09:01:00`,
      ),
    )

    const mapIdToSlug = new Map<number, string>([[40380, 'clark-lake']])
    const result = parseCtaSchedules(zip, mapIdToSlug)
    const schedule = result.get('clark-lake')!

    // Should have only one departure per trip per station
    expect(schedule.directions[0].weekday).toHaveLength(1)
    expect(schedule.directions[0].weekday[0]).toBe(540) // 09:00
  })
})
