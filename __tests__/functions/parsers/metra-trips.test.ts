import AdmZip from 'adm-zip'
import { parseMetraTrips } from '@functions/lib/parsers/metra-trips'

function makeMetraGtfsZip(): AdmZip {
  const zip = new AdmZip()

  zip.addFile(
    'stops.txt',
    Buffer.from(
      `stop_id,stop_name
ROUTE59,Route 59
NAPERVILLE,Naperville
CUS,Chicago Union Station`,
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
WK,1,1,1,1,1,0,0`,
    ),
  )

  zip.addFile(
    'trips.txt',
    Buffer.from(
      `trip_id,route_id,service_id,trip_headsign,trip_short_name,direction_id
BNSF_BN1234,BNSF,WK,Chicago Union Station,1234,0`,
    ),
  )

  zip.addFile(
    'stop_times.txt',
    Buffer.from(
      `trip_id,stop_id,stop_sequence,arrival_time,departure_time
BNSF_BN1234,ROUTE59,1,06:45:00,06:45:00
BNSF_BN1234,NAPERVILLE,2,06:55:00,06:55:00
BNSF_BN1234,CUS,3,07:30:00,07:30:00`,
    ),
  )

  return zip
}

describe('parseMetraTrips', () => {
  const stopIdToSlug = new Map([
    ['ROUTE59', 'route-59'],
    ['NAPERVILLE', 'naperville'],
    ['CUS', 'union-station-metra'],
  ])
  const stopIdToName = new Map([
    ['ROUTE59', 'Route 59'],
    ['NAPERVILLE', 'Naperville'],
    ['CUS', 'Chicago Union Station'],
  ])
  const lineCodeToSlug = new Map([['BNSF', 'bnsf']])
  const lineCodeToName = new Map([['BNSF', 'BNSF Railway Line']])

  it('produces trip details with correct stop sequence', () => {
    const zip = makeMetraGtfsZip()
    const result = parseMetraTrips(zip, stopIdToSlug, stopIdToName, lineCodeToSlug, lineCodeToName)

    expect(result.tripDetails.size).toBe(1)
    const detail = result.tripDetails.get('bnsf_bn1234')!
    expect(detail.trainNumber).toBe('1234')
    expect(detail.headsign).toBe('Chicago Union Station')
    expect(detail.line).toBe('BNSF')
    expect(detail.lineSlug).toBe('bnsf')
    expect(detail.stops).toHaveLength(3)
    expect(detail.stops[0].stationName).toBe('Route 59')
    expect(detail.stops[0].departure).toBe('6:45 AM')
    expect(detail.stops[2].stationName).toBe('Chicago Union Station')
    expect(detail.stops[2].arrival).toBe('7:30 AM')
  })

  it('produces trip indexes grouped by line and service type', () => {
    const zip = makeMetraGtfsZip()
    const result = parseMetraTrips(zip, stopIdToSlug, stopIdToName, lineCodeToSlug, lineCodeToName)

    expect(result.tripIndexes.size).toBe(1)
    const index = result.tripIndexes.get('bnsf')!
    expect(index.weekday).toHaveLength(1)
    expect(index.weekday[0].tripId).toBe('bnsf_bn1234')
    expect(index.weekday[0].trainNumber).toBe('1234')
    expect(index.weekday[0].firstDeparture).toBe('6:45 AM')
    expect(index.saturday).toHaveLength(0)
    expect(index.sunday).toHaveLength(0)
  })

  it('produces station trips for each stop on the trip', () => {
    const zip = makeMetraGtfsZip()
    const result = parseMetraTrips(zip, stopIdToSlug, stopIdToName, lineCodeToSlug, lineCodeToName)

    expect(result.stationTrips.size).toBe(3)

    const route59 = result.stationTrips.get('route-59')!
    expect(route59.weekday).toHaveLength(1)
    expect(route59.weekday[0].departure).toBe('6:45 AM')
    expect(route59.weekday[0].trainNumber).toBe('1234')

    const cus = result.stationTrips.get('union-station-metra')!
    expect(cus.weekday).toHaveLength(1)
    expect(cus.weekday[0].departure).toBe('7:30 AM')
  })

  it('skips trips with no matching line slug', () => {
    const zip = makeMetraGtfsZip()
    const emptyLineMap = new Map<string, string>()
    const result = parseMetraTrips(zip, stopIdToSlug, stopIdToName, emptyLineMap, lineCodeToName)

    expect(result.tripDetails.size).toBe(0)
    expect(result.tripIndexes.size).toBe(0)
    expect(result.stationTrips.size).toBe(0)
  })
})
