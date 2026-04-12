import {
  annotate,
  buildTrainRow,
  currentServiceType,
  extractMatchedRealtime,
  formatEta,
  selectTrainsForDisplay,
  type TripWithDepartureMinutes,
} from '@lib/metra-current-service-helpers'
import type { MetraLineTrip } from '@lib/transit'
import type { RealtimeState } from '@lib/metra-status'

function makeTrip(
  trainNumber: string,
  firstDep: string,
  lastArr: string,
  serviceType: 'weekday' | 'saturday' | 'sunday' = 'weekday',
  headsign = 'Union Station',
): MetraLineTrip {
  return {
    trainNumber,
    headsign,
    serviceType,
    directionId: 0,
    stops: [
      {
        sequence: 1,
        stationName: 'Aurora',
        slug: 'aurora',
        arrival: firstDep,
        departure: firstDep,
      },
      {
        sequence: 2,
        stationName: 'Naperville',
        slug: 'naperville',
        arrival: '7:15 AM',
        departure: '7:16 AM',
      },
      {
        sequence: 4,
        stationName: 'Union Station',
        slug: 'union-station',
        arrival: lastArr,
        departure: lastArr,
      },
    ],
  }
}

describe('currentServiceType', () => {
  it('maps Sunday to sunday', () => {
    expect(currentServiceType(new Date(2026, 0, 4))).toBe('sunday')
  })
  it('maps Saturday to saturday', () => {
    expect(currentServiceType(new Date(2026, 0, 3))).toBe('saturday')
  })
  it('maps weekdays to weekday', () => {
    expect(currentServiceType(new Date(2026, 0, 5))).toBe('weekday') // Monday
    expect(currentServiceType(new Date(2026, 0, 9))).toBe('weekday') // Friday
  })
})

describe('formatEta', () => {
  it('returns "arriving" when ETA has already passed', () => {
    const nowMs = new Date(2026, 0, 1, 8, 0, 0).getTime()
    const etaSec = Math.floor((nowMs - 60_000) / 1000)
    expect(formatEta(nowMs, etaSec, null).etaText).toBe('arriving')
  })
  it('returns "N min" when ETA is in the future', () => {
    const nowMs = new Date(2026, 0, 1, 8, 0, 0).getTime()
    const etaSec = Math.floor((nowMs + 5 * 60_000) / 1000)
    expect(formatEta(nowMs, etaSec, null).etaText).toBe('5 min')
  })
  it('falls back to display string when no epoch', () => {
    expect(formatEta(0, null, '7:30 AM').etaText).toBe('7:30 AM')
  })
  it('returns null when neither is available', () => {
    expect(formatEta(0, null, null).etaText).toBeNull()
  })
})

describe('extractMatchedRealtime', () => {
  it('returns empty map for null feed', () => {
    expect(extractMatchedRealtime(null, 'bnsf').size).toBe(0)
  })
  it('indexes entities by train number and filters by line slug', () => {
    const feed = {
      entity: [
        {
          id: '1',
          tripUpdate: {
            trip: { tripId: 'BNSF_BN1234_V1_A', routeId: 'BNSF' },
            stopTimeUpdate: [],
          },
        },
        {
          id: '2',
          tripUpdate: {
            trip: { tripId: 'UP-N_UN999_V1_A', routeId: 'UP-N' },
            stopTimeUpdate: [],
          },
        },
        {
          id: '3',
          vehicle: { trip: { tripId: 'BNSF_BN1234_V1_A', routeId: 'BNSF' } },
        },
      ],
    } as never

    const matched = extractMatchedRealtime(feed, 'bnsf')
    expect(matched.size).toBe(1)
    const entry = matched.get('1234')
    expect(entry?.tripUpdate).toBeTruthy()
    expect(entry?.vehiclePosition).toBeTruthy()
  })
})

describe('annotate', () => {
  it('adds departure/arrival minutes and drops unparseable trips', () => {
    const valid = makeTrip('1', '6:30 AM', '7:30 AM')
    const invalid = {
      ...makeTrip('2', 'not-a-time', '7:30 AM'),
    }
    const annotated = annotate([valid, invalid])
    expect(annotated).toHaveLength(1)
    expect(annotated[0].firstDepartureMinutes).toBe(6 * 60 + 30)
    expect(annotated[0].lastArrivalMinutes).toBe(7 * 60 + 30)
  })
})

describe('selectTrainsForDisplay', () => {
  const trips: TripWithDepartureMinutes[] = [
    { ...makeTrip('A', '6:30 AM', '7:30 AM'), firstDepartureMinutes: 390, lastArrivalMinutes: 450 },
    { ...makeTrip('B', '7:15 AM', '8:15 AM'), firstDepartureMinutes: 435, lastArrivalMinutes: 495 },
    {
      ...makeTrip('C', '9:00 AM', '10:00 AM'),
      firstDepartureMinutes: 540,
      lastArrivalMinutes: 600,
    },
  ]

  it('prefers active trains and fills with upcoming in window', () => {
    const result = selectTrainsForDisplay(trips, new Set(['A']), 420, 'weekday')
    expect(result.fallbackOnly).toBe(false)
    const shown = result.shown.map((t) => t.trainNumber)
    expect(shown).toContain('A') // active
    expect(shown).toContain('B') // within 60 min window
    expect(shown).not.toContain('C') // outside window
  })

  it('falls back to the next scheduled train when nothing qualifies', () => {
    const result = selectTrainsForDisplay(trips, new Set(), 540, 'weekday')
    expect(result.fallbackOnly).toBe(false)
    // 9 AM is exactly at the window start for C
    expect(result.shown.map((t) => t.trainNumber)).toContain('C')
  })

  it('returns fallbackOnly with next scheduled when window is empty', () => {
    const result = selectTrainsForDisplay(trips, new Set(), 460, 'weekday')
    // 7:40 AM — B already departed (7:15), C not in window yet
    expect(result.fallbackOnly).toBe(true)
    expect(result.shown.map((t) => t.trainNumber)).toEqual(['C'])
  })

  it('returns empty shown list when no trains remain today', () => {
    const result = selectTrainsForDisplay(trips, new Set(), 700, 'weekday')
    expect(result.fallbackOnly).toBe(true)
    expect(result.shown).toHaveLength(0)
  })
})

describe('buildTrainRow', () => {
  const trip = makeTrip('1234', '6:30 AM', '7:30 AM')

  it('builds a scheduled row when there is no realtime state', () => {
    const row = buildTrainRow(trip, null, 'bnsf', Date.now(), 7 * 60)
    expect(row).toMatchObject({
      trainNumber: '1234',
      href: '/metra/bnsf/train/1234',
      destination: 'Union Station',
      statusTone: 'scheduled',
    })
    expect(row?.statusLabel).toBe('Scheduled 6:30 AM')
  })

  it('builds an active row when the realtime phase is active', () => {
    const realtime: RealtimeState = {
      tripUpdate: {
        trip: { tripId: 'BNSF_BN1234_V1_A', routeId: 'BNSF', startDate: '20260101' },
        stopTimeUpdate: [{ stopSequence: 2, arrival: { time: 1_000_000 } }],
      } as never,
      vehiclePosition: null,
      fetchedAt: Date.now(),
      stopped: false,
    }
    const row = buildTrainRow(trip, realtime, 'bnsf', Date.now(), 7 * 60)
    expect(row?.statusTone).not.toBe('scheduled')
  })
})
