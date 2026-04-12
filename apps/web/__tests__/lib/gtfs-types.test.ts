import type {
  DirectionSchedule,
  ServiceType,
  StationSchedule,
  StationTripEntry,
  StationTrips,
} from '@lib/gtfs-types'

describe('gtfs-types', () => {
  it('compiles sample values matching each exported type', () => {
    const serviceType: ServiceType = 'weekday'
    expect(['weekday', 'saturday', 'sunday']).toContain(serviceType)

    const direction: DirectionSchedule = {
      headsign: 'Howard',
      line: 'Red',
      weekday: [420, 480],
      saturday: [600],
      sunday: [],
    }
    expect(direction.weekday).toHaveLength(2)

    const schedule: StationSchedule = { directions: [direction] }
    expect(schedule.directions[0].headsign).toBe('Howard')

    const entry: StationTripEntry = {
      tripId: 'BNSF_BN1200_V4_A',
      trainNumber: '1200',
      headsign: 'Aurora',
      departure: '7:30 AM',
      line: 'BNSF',
      lineSlug: 'bnsf',
      directionId: 0,
    }
    expect(entry.trainNumber).toBe('1200')

    const trips: StationTrips = { weekday: [entry], saturday: [], sunday: [] }
    expect(trips.weekday).toHaveLength(1)
  })
})
