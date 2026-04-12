import {
  computeRightPanel,
  filterFeedForTrip,
  isTripCompleted,
  matchEntityToTrip,
} from '@lib/metra-trip-realtime-helpers'
import type { TripStop, TripUpdate } from '@lib/metra-status'

function tripUpdate(
  tripId: string,
  routeId: string,
  stu: Array<{ stopSequence: number; scheduleRelationship?: number; arrivalTime?: number }> = [],
): TripUpdate {
  return {
    trip: { tripId, routeId, startDate: '20260411' },
    stopTimeUpdate: stu.map((s) => ({
      stopSequence: s.stopSequence,
      scheduleRelationship: s.scheduleRelationship,
      arrival: s.arrivalTime != null ? { time: s.arrivalTime } : undefined,
    })),
  } as never
}

function entity(
  id: string,
  options: { tripUpdate?: TripUpdate; vehicle?: { trip: { tripId: string; routeId: string } } },
): never {
  return { id, ...options } as never
}

describe('matchEntityToTrip', () => {
  it('matches on line slug and train number extracted from trip_id', () => {
    const e = entity('1', { tripUpdate: tripUpdate('BNSF_BN1234_V1_A', 'BNSF') })
    expect(matchEntityToTrip(e, 'bnsf', '1234')).toBe(true)
  })

  it('rejects entities on a different line', () => {
    const e = entity('1', { tripUpdate: tripUpdate('UP-N_UN500_V1_A', 'UP-N') })
    expect(matchEntityToTrip(e, 'bnsf', '500')).toBe(false)
  })

  it('rejects entities on the same line but a different train number', () => {
    const e = entity('1', { tripUpdate: tripUpdate('BNSF_BN1234_V1_A', 'BNSF') })
    expect(matchEntityToTrip(e, 'bnsf', '9999')).toBe(false)
  })

  it('returns false when the entity has neither a tripUpdate nor a vehicle', () => {
    const e = entity('1', {})
    expect(matchEntityToTrip(e, 'bnsf', '1234')).toBe(false)
  })

  it('can match via the vehicle.trip fallback', () => {
    const e = entity('1', { vehicle: { trip: { tripId: 'BNSF_BN77_V1_A', routeId: 'BNSF' } } })
    expect(matchEntityToTrip(e, 'bnsf', '77')).toBe(true)
  })
})

describe('filterFeedForTrip', () => {
  it('returns null/null for a null feed', () => {
    expect(filterFeedForTrip(null, 'bnsf', '1234')).toEqual({
      tripUpdate: null,
      vehiclePosition: null,
    })
  })

  it('returns the first matching tripUpdate and vehicle separately', () => {
    const match1 = entity('1', { tripUpdate: tripUpdate('BNSF_BN1234_V1_A', 'BNSF') })
    const match2 = entity('2', {
      vehicle: { trip: { tripId: 'BNSF_BN1234_V1_A', routeId: 'BNSF' } },
    })
    const other = entity('3', { tripUpdate: tripUpdate('BNSF_BN9999_V1_A', 'BNSF') })
    const feed = { entity: [match1, other, match2] } as never

    const result = filterFeedForTrip(feed, 'bnsf', '1234')
    expect(result.tripUpdate).toBeTruthy()
    expect(result.vehiclePosition).toBeTruthy()
  })

  it('returns nulls when no entity matches', () => {
    const feed = {
      entity: [entity('1', { tripUpdate: tripUpdate('BNSF_BN9999_V1_A', 'BNSF') })],
    } as never
    expect(filterFeedForTrip(feed, 'bnsf', '1234')).toEqual({
      tripUpdate: null,
      vehiclePosition: null,
    })
  })
})

describe('isTripCompleted', () => {
  const base = { emptyCount: 0, emptyThreshold: 2, scheduledEndPast: false }

  it('flags a trip as completed when tripUpdate has zero non-skipped stops', () => {
    const tu = tripUpdate('BNSF_BN1_V1_A', 'BNSF', [{ stopSequence: 1, scheduleRelationship: 1 }])
    expect(isTripCompleted({ ...base, tripUpdate: tu, vehiclePosition: null })).toBe(true)
  })

  it('does not flag completion when tripUpdate still has non-skipped stops', () => {
    const tu = tripUpdate('BNSF_BN1_V1_A', 'BNSF', [{ stopSequence: 2 }])
    expect(isTripCompleted({ ...base, tripUpdate: tu, vehiclePosition: null })).toBe(false)
  })

  it('flags completion only when empty threshold is met AND schedule end is past', () => {
    expect(
      isTripCompleted({
        ...base,
        tripUpdate: null,
        vehiclePosition: null,
        emptyCount: 2,
        scheduledEndPast: true,
      }),
    ).toBe(true)
    expect(
      isTripCompleted({
        ...base,
        tripUpdate: null,
        vehiclePosition: null,
        emptyCount: 2,
        scheduledEndPast: false,
      }),
    ).toBe(false)
    expect(
      isTripCompleted({
        ...base,
        tripUpdate: null,
        vehiclePosition: null,
        emptyCount: 1,
        scheduledEndPast: true,
      }),
    ).toBe(false)
  })
})

describe('computeRightPanel', () => {
  const firstStop: TripStop = {
    sequence: 1,
    stationName: 'Aurora',
    slug: 'aurora',
    arrival: '5:30 AM',
    departure: '5:30 AM',
  }
  const midStop: TripStop = {
    sequence: 2,
    stationName: 'Naperville',
    slug: 'naperville',
    arrival: '5:45 AM',
    departure: '5:46 AM',
  }
  const lastStop: TripStop = {
    sequence: 4,
    stationName: 'Union Station',
    slug: 'union-station',
    arrival: '6:30 AM',
    departure: '6:30 AM',
  }

  it('renders "Next stop" with ETA subtext when the trip is active and has an etaEpoch', () => {
    const nowMs = new Date(2026, 0, 1, 5, 40, 0).getTime()
    const eta = Math.floor(new Date(2026, 0, 1, 5, 48, 0).getTime() / 1000)
    const panel = computeRightPanel(
      'active',
      { stop: midStop, etaEpoch: eta },
      firstStop,
      lastStop,
      nowMs,
    )
    expect(panel?.title).toBe('Next stop')
    expect(panel?.station).toBe('Naperville')
    expect(panel?.subtext).toBe('in 8 min')
    expect(panel?.time).toMatch(/5:48/)
  })

  it('shows "arriving now" when diff is zero', () => {
    const now = new Date(2026, 0, 1, 5, 48, 0).getTime()
    const eta = Math.floor(now / 1000)
    const panel = computeRightPanel(
      'active',
      { stop: midStop, etaEpoch: eta },
      firstStop,
      lastStop,
      now,
    )
    expect(panel?.subtext).toBe('arriving now')
  })

  it('falls back to scheduled arrival when etaEpoch is null', () => {
    const panel = computeRightPanel(
      'active',
      { stop: midStop, etaEpoch: null },
      firstStop,
      lastStop,
      Date.now(),
    )
    expect(panel?.time).toBe('5:45 AM')
    expect(panel?.subtext).toBeNull()
  })

  it('uses "Departs" for scheduled phase with first stop', () => {
    const panel = computeRightPanel('scheduled', undefined, firstStop, lastStop, Date.now())
    expect(panel).toEqual({
      title: 'Departs',
      station: 'Aurora',
      time: '5:30 AM',
      subtext: null,
    })
  })

  it('uses "Arrived" for completed phase with last stop', () => {
    const panel = computeRightPanel('completed', undefined, firstStop, lastStop, Date.now())
    expect(panel).toEqual({
      title: 'Arrived',
      station: 'Union Station',
      time: '6:30 AM',
      subtext: null,
    })
  })

  it('returns null for nodata phase', () => {
    expect(computeRightPanel('nodata', undefined, firstStop, lastStop, Date.now())).toBeNull()
  })
})
