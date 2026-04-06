import AdmZip from 'adm-zip'
import { parseMetraSchedules } from '@functions/lib/parsers/metra-schedules'

function makeMetraGtfsZip(): AdmZip {
  const zip = new AdmZip()

  zip.addFile(
    'stops.txt',
    Buffer.from(
      `stop_id,stop_name
ROUTE59,Route 59
NAPERVILLE,Naperville`,
    ),
  )

  zip.addFile(
    'routes.txt',
    Buffer.from(
      `route_id,route_short_name,route_long_name
BNSF,BNSF,BNSF Railway`,
    ),
  )

  zip.addFile(
    'calendar.txt',
    Buffer.from(
      `service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday
WK,1,1,1,1,1,0,0
SUN,0,0,0,0,0,0,1`,
    ),
  )

  zip.addFile(
    'trips.txt',
    Buffer.from(
      `trip_id,route_id,service_id,trip_headsign
T1,BNSF,WK,Chicago Union Station
T2,BNSF,SUN,Chicago Union Station`,
    ),
  )

  zip.addFile(
    'stop_times.txt',
    Buffer.from(
      `trip_id,stop_id,stop_sequence,departure_time
T1,ROUTE59,1,06:45:00
T1,NAPERVILLE,2,06:55:00
T2,ROUTE59,1,08:00:00`,
    ),
  )

  return zip
}

describe('parseMetraSchedules', () => {
  it('parses a minimal Metra GTFS zip into station schedules', () => {
    const zip = makeMetraGtfsZip()
    const stopIdToSlug = new Map([
      ['ROUTE59', 'route-59'],
      ['NAPERVILLE', 'naperville'],
    ])

    const result = parseMetraSchedules(zip, stopIdToSlug)

    expect(result.size).toBe(2)

    const route59 = result.get('route-59')!
    expect(route59.service).toBe('metra')
    expect(route59.directions).toHaveLength(1)
    expect(route59.directions[0].line).toBe('BNSF')
    expect(route59.directions[0].weekday).toEqual([405]) // 6:45 = 405
    expect(route59.directions[0].sunday).toEqual([480]) // 8:00 = 480

    const naperville = result.get('naperville')!
    expect(naperville.directions[0].weekday).toEqual([415]) // 6:55 = 415
    expect(naperville.directions[0].sunday).toEqual([]) // T2 doesn't stop here
  })

  it('skips stops not in stopIdToSlug lookup', () => {
    const zip = makeMetraGtfsZip()
    const stopIdToSlug = new Map<string, string>() // empty

    const result = parseMetraSchedules(zip, stopIdToSlug)

    expect(result.size).toBe(0)
  })
})
