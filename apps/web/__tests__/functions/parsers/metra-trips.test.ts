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
BNSF_BN1234_V4_A,BNSF,WK,Chicago Union Station,1234,0`,
    ),
  )

  zip.addFile(
    'stop_times.txt',
    Buffer.from(
      `trip_id,stop_id,stop_sequence,arrival_time,departure_time
BNSF_BN1234_V4_A,ROUTE59,1,06:45:00,06:45:00
BNSF_BN1234_V4_A,NAPERVILLE,2,06:55:00,06:55:00
BNSF_BN1234_V4_A,CUS,3,07:30:00,07:30:00`,
    ),
  )

  return zip
}

function makeMetraGtfsZipWithDuplicateTrainVariants(): AdmZip {
  const zip = new AdmZip()

  zip.addFile(
    'stops.txt',
    Buffer.from(
      `stop_id,stop_name
ROUTE59,Route 59
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

  // Three variants of the same train number (1234) representing different
  // calendar periods — all identical otherwise.
  zip.addFile(
    'trips.txt',
    Buffer.from(
      `trip_id,route_id,service_id,trip_headsign,trip_short_name,direction_id
BNSF_BN1234_V4_A,BNSF,WK,Chicago Union Station,1234,0
BNSF_BN1234_V4_AA,BNSF,WK,Chicago Union Station,1234,0
BNSF_BN1234_V4_B,BNSF,WK,Chicago Union Station,1234,0`,
    ),
  )

  zip.addFile(
    'stop_times.txt',
    Buffer.from(
      `trip_id,stop_id,stop_sequence,arrival_time,departure_time
BNSF_BN1234_V4_A,ROUTE59,1,06:45:00,06:45:00
BNSF_BN1234_V4_A,CUS,2,07:30:00,07:30:00
BNSF_BN1234_V4_AA,ROUTE59,1,06:45:00,06:45:00
BNSF_BN1234_V4_AA,CUS,2,07:30:00,07:30:00
BNSF_BN1234_V4_B,ROUTE59,1,06:45:00,06:45:00
BNSF_BN1234_V4_B,CUS,2,07:30:00,07:30:00`,
    ),
  )

  return zip
}

// Metra reuses weekend train numbers (e.g. 2700) for BOTH Saturday and Sunday
// as separate trip_id calendar variants. The Saturday variant also has a
// same-service `_AA` duplicate that must still collapse within Saturday.
function makeMetraGtfsZipWithCrossServiceDayTrainNumber(): AdmZip {
  const zip = new AdmZip()

  zip.addFile(
    'stops.txt',
    Buffer.from(
      `stop_id,stop_name
ROUTE59,Route 59
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
SAT,0,0,0,0,0,1,0
SUN,0,0,0,0,0,0,1`,
    ),
  )

  // Train 2700: a Saturday variant (+ a same-service _AA duplicate) and a
  // distinct Sunday variant at a different time.
  zip.addFile(
    'trips.txt',
    Buffer.from(
      `trip_id,route_id,service_id,trip_headsign,trip_short_name,direction_id
BNSF_BN2700_V4_A,BNSF,SAT,Chicago Union Station,2700,1
BNSF_BN2700_V4_AA,BNSF,SAT,Chicago Union Station,2700,1
BNSF_BN2700_V4_B,BNSF,SUN,Chicago Union Station,2700,1`,
    ),
  )

  zip.addFile(
    'stop_times.txt',
    Buffer.from(
      `trip_id,stop_id,stop_sequence,arrival_time,departure_time
BNSF_BN2700_V4_A,ROUTE59,1,08:12:00,08:12:00
BNSF_BN2700_V4_A,CUS,2,09:00:00,09:00:00
BNSF_BN2700_V4_AA,ROUTE59,1,08:12:00,08:12:00
BNSF_BN2700_V4_AA,CUS,2,09:00:00,09:00:00
BNSF_BN2700_V4_B,ROUTE59,1,10:12:00,10:12:00
BNSF_BN2700_V4_B,CUS,2,11:00:00,11:00:00`,
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
    const detail = result.tripDetails.get('bnsf_1234')!
    expect(detail.tripId).toBe('bnsf_1234')
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
    expect(index.weekday[0].tripId).toBe('1234')
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
    expect(route59.weekday[0].tripId).toBe('1234')

    const cus = result.stationTrips.get('union-station-metra')!
    expect(cus.weekday).toHaveLength(1)
    expect(cus.weekday[0].departure).toBe('7:30 AM')
  })

  it('deduplicates multiple trip_id variants sharing a train number', () => {
    const zip = makeMetraGtfsZipWithDuplicateTrainVariants()
    const result = parseMetraTrips(
      zip,
      new Map([
        ['ROUTE59', 'route-59'],
        ['CUS', 'union-station-metra'],
      ]),
      new Map([
        ['ROUTE59', 'Route 59'],
        ['CUS', 'Chicago Union Station'],
      ]),
      lineCodeToSlug,
      lineCodeToName,
    )

    // Only one TripDetail despite three trip_id variants in GTFS
    expect(result.tripDetails.size).toBe(1)
    expect(result.tripDetails.has('bnsf_1234')).toBe(true)

    // Index has one entry, not three
    expect(result.tripIndexes.get('bnsf')!.weekday).toHaveLength(1)

    // Each station has one entry for train 1234, not three
    expect(result.stationTrips.get('route-59')!.weekday).toHaveLength(1)
    expect(result.stationTrips.get('union-station-metra')!.weekday).toHaveLength(1)
  })

  it('keeps every service day when a train number is reused across days', () => {
    const zip = makeMetraGtfsZipWithCrossServiceDayTrainNumber()
    const result = parseMetraTrips(
      zip,
      new Map([
        ['ROUTE59', 'route-59'],
        ['CUS', 'union-station-metra'],
      ]),
      new Map([
        ['ROUTE59', 'Route 59'],
        ['CUS', 'Chicago Union Station'],
      ]),
      lineCodeToSlug,
      lineCodeToName,
    )

    // Still one detail doc — the collection is one-doc-per-train by design.
    expect(result.tripDetails.size).toBe(1)
    expect(result.tripDetails.has('bnsf_2700')).toBe(true)

    // Station trips: train 2700 present on BOTH Saturday and Sunday, and the
    // same-service `_AA` duplicate did not double-list within Saturday.
    const route59 = result.stationTrips.get('route-59')!
    expect(route59.saturday).toHaveLength(1)
    expect(route59.saturday[0].trainNumber).toBe('2700')
    expect(route59.saturday[0].departure).toBe('8:12 AM')
    expect(route59.sunday).toHaveLength(1)
    expect(route59.sunday[0].trainNumber).toBe('2700')
    expect(route59.sunday[0].departure).toBe('10:12 AM')

    // Line index likewise carries both service days.
    const index = result.tripIndexes.get('bnsf')!
    expect(index.saturday).toHaveLength(1)
    expect(index.sunday).toHaveLength(1)
    expect(index.weekday).toHaveLength(0)
  })

  it('flags express trips when stop count is well below the line max', () => {
    const zip = new AdmZip()
    zip.addFile(
      'stops.txt',
      Buffer.from(
        `stop_id,stop_name
S1,Stop 1
S2,Stop 2
S3,Stop 3
S4,Stop 4
S5,Stop 5
S6,Stop 6
S7,Stop 7
S8,Stop 8
S9,Stop 9
CUS,Chicago Union Station`,
      ),
    )
    zip.addFile(
      'routes.txt',
      Buffer.from(`route_id,route_short_name,route_long_name\nBNSF,BNSF,BNSF Railway`),
    )
    zip.addFile(
      'calendar.txt',
      Buffer.from(
        `service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday\nWK,1,1,1,1,1,0,0`,
      ),
    )
    zip.addFile(
      'trips.txt',
      Buffer.from(
        `trip_id,route_id,service_id,trip_headsign,trip_short_name,direction_id
LOCAL_A,BNSF,WK,Chicago Union Station,1000,0
EXPRESS_A,BNSF,WK,Chicago Union Station,2000,0`,
      ),
    )
    // Local: 10 stops. Express: 3 stops (well below 0.85 * 10 = 8.5).
    zip.addFile(
      'stop_times.txt',
      Buffer.from(
        `trip_id,stop_id,stop_sequence,arrival_time,departure_time
LOCAL_A,S1,1,06:00:00,06:00:00
LOCAL_A,S2,2,06:05:00,06:05:00
LOCAL_A,S3,3,06:10:00,06:10:00
LOCAL_A,S4,4,06:15:00,06:15:00
LOCAL_A,S5,5,06:20:00,06:20:00
LOCAL_A,S6,6,06:25:00,06:25:00
LOCAL_A,S7,7,06:30:00,06:30:00
LOCAL_A,S8,8,06:35:00,06:35:00
LOCAL_A,S9,9,06:40:00,06:40:00
LOCAL_A,CUS,10,06:45:00,06:45:00
EXPRESS_A,S1,1,07:00:00,07:00:00
EXPRESS_A,S5,2,07:15:00,07:15:00
EXPRESS_A,CUS,3,07:30:00,07:30:00`,
      ),
    )

    const slugs = new Map([
      ['S1', 's1'],
      ['S2', 's2'],
      ['S3', 's3'],
      ['S4', 's4'],
      ['S5', 's5'],
      ['S6', 's6'],
      ['S7', 's7'],
      ['S8', 's8'],
      ['S9', 's9'],
      ['CUS', 'union-station-metra'],
    ])
    const names = new Map(Array.from(slugs.keys()).map((id) => [id, id]))
    const result = parseMetraTrips(zip, slugs, names, lineCodeToSlug, lineCodeToName)

    const local = result.tripDetails.get('bnsf_1000')!
    const express = result.tripDetails.get('bnsf_2000')!
    expect(local.isExpress).toBe(false)
    expect(express.isExpress).toBe(true)
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
