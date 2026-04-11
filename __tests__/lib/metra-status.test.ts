/**
 * @jest-environment node
 */
import {
  computeHeroStatus,
  computeScheduledEpoch,
  deriveStopState,
  isTripScheduledEndPast,
  longToNumber,
  minutesSinceMidnight,
  parseDisplayTimeToMinutes,
  type RealtimeState,
  type TripStop,
} from '@lib/metra-status'

const START_DATE = '21000101'
const AURORA_EPOCH = Math.floor(new Date(2100, 0, 1, 5, 30, 0).getTime() / 1000)
const NAPERVILLE_EPOCH = Math.floor(new Date(2100, 0, 1, 5, 45, 0).getTime() / 1000)
const DOWNERS_EPOCH = Math.floor(new Date(2100, 0, 1, 6, 0, 0).getTime() / 1000)

const stops: TripStop[] = [
  { sequence: 1, stationName: 'Aurora', slug: 'aurora', arrival: '5:30 AM', departure: '5:30 AM' },
  {
    sequence: 2,
    stationName: 'Naperville',
    slug: 'naperville',
    arrival: '5:45 AM',
    departure: '5:46 AM',
  },
  {
    sequence: 3,
    stationName: 'Downers Grove',
    slug: 'downers-grove',
    arrival: '6:00 AM',
    departure: '6:01 AM',
  },
  {
    sequence: 4,
    stationName: 'Union Station',
    slug: 'union-station',
    arrival: '6:30 AM',
    departure: '6:30 AM',
  },
]

function buildRealtime(
  stopTimeUpdate: Array<{
    stopSequence: number
    arrivalTime?: number
    scheduleRelationship?: number
  }>,
): RealtimeState {
  return {
    tripUpdate: {
      trip: { tripId: 'BNSF_BN1234_V1_A', routeId: 'BNSF', startDate: START_DATE },
      stopTimeUpdate: stopTimeUpdate.map((s) => ({
        stopSequence: s.stopSequence,
        arrival: s.arrivalTime != null ? { time: s.arrivalTime } : undefined,
        scheduleRelationship: s.scheduleRelationship,
      })),
    } as RealtimeState['tripUpdate'],
    vehiclePosition: null,
    fetchedAt: Date.now(),
    stopped: false,
  }
}

describe('longToNumber', () => {
  it('returns null for null/undefined', () => {
    expect(longToNumber(null)).toBeNull()
    expect(longToNumber(undefined)).toBeNull()
  })
  it('passes through numbers', () => {
    expect(longToNumber(42)).toBe(42)
  })
  it('unwraps Long-like objects with toNumber()', () => {
    expect(longToNumber({ toNumber: () => 99 })).toBe(99)
  })
})

describe('parseDisplayTimeToMinutes', () => {
  it('parses AM times', () => {
    expect(parseDisplayTimeToMinutes('5:30 AM')).toBe(330)
  })
  it('parses PM times', () => {
    expect(parseDisplayTimeToMinutes('1:15 PM')).toBe(13 * 60 + 15)
  })
  it('handles 12 AM as midnight', () => {
    expect(parseDisplayTimeToMinutes('12:00 AM')).toBe(0)
  })
  it('handles 12 PM as noon', () => {
    expect(parseDisplayTimeToMinutes('12:00 PM')).toBe(720)
  })
  it('returns null on garbage input', () => {
    expect(parseDisplayTimeToMinutes('nonsense')).toBeNull()
  })
})

describe('minutesSinceMidnight', () => {
  it('computes minutes from a Date', () => {
    const d = new Date(2100, 0, 1, 6, 15, 0)
    expect(minutesSinceMidnight(d)).toBe(6 * 60 + 15)
  })
})

describe('computeScheduledEpoch', () => {
  it('combines startDate and display time into an epoch', () => {
    expect(computeScheduledEpoch('21000101', '5:30 AM')).toBe(AURORA_EPOCH)
  })
  it('returns null for malformed startDate', () => {
    expect(computeScheduledEpoch(null, '5:30 AM')).toBeNull()
    expect(computeScheduledEpoch('2100', '5:30 AM')).toBeNull()
  })
  it('returns null for malformed time', () => {
    expect(computeScheduledEpoch('21000101', '')).toBeNull()
  })
})

describe('isTripScheduledEndPast', () => {
  it('returns true when scheduled end is more than 15 min ago', () => {
    // last stop 6:30 AM, now 7:00 AM
    expect(isTripScheduledEndPast(stops, 7 * 60)).toBe(true)
  })
  it('returns false when scheduled end is recent', () => {
    expect(isTripScheduledEndPast(stops, 6 * 60 + 40)).toBe(false)
  })
  it('returns false for empty stops', () => {
    expect(isTripScheduledEndPast([], 0)).toBe(false)
  })
})

describe('deriveStopState', () => {
  it('returns all upcoming with phase nodata when realtime is null', () => {
    const { stops: derived, phase } = deriveStopState(stops, null)
    expect(phase).toBe('nodata')
    expect(derived.every((s) => s.status === 'upcoming')).toBe(true)
  })

  it('marks past/current/upcoming based on min STU sequence', () => {
    const rt = buildRealtime([
      { stopSequence: 3, arrivalTime: DOWNERS_EPOCH },
      { stopSequence: 4, arrivalTime: DOWNERS_EPOCH + 1800 },
    ])
    const { stops: derived, phase } = deriveStopState(stops, rt)
    expect(phase).toBe('active')
    expect(derived[0].status).toBe('past')
    expect(derived[1].status).toBe('past')
    expect(derived[2].status).toBe('current')
    expect(derived[3].status).toBe('upcoming')
  })

  it('computes delay minutes from realtime vs scheduled', () => {
    const rt = buildRealtime([
      { stopSequence: 2, arrivalTime: NAPERVILLE_EPOCH + 420 },
      { stopSequence: 3, arrivalTime: DOWNERS_EPOCH + 420 },
    ])
    const { stops: derived, tripDelayMinutes } = deriveStopState(stops, rt)
    expect(tripDelayMinutes).toBe(7)
    expect(derived[1].delayMinutes).toBe(7)
  })

  it('flags a skipped stop', () => {
    const rt = buildRealtime([
      { stopSequence: 2, scheduleRelationship: 1 },
      { stopSequence: 3, arrivalTime: DOWNERS_EPOCH },
    ])
    const { stops: derived } = deriveStopState(stops, rt)
    expect(derived[1].skipped).toBe(true)
  })

  it('returns completed phase and all past when STU is empty', () => {
    const rt = buildRealtime([])
    const { stops: derived, phase } = deriveStopState(stops, rt)
    expect(phase).toBe('completed')
    expect(derived.every((s) => s.status === 'past')).toBe(true)
  })
})

describe('computeHeroStatus', () => {
  it('returns Completed for completed phase', () => {
    expect(computeHeroStatus('completed', null, stops[0], 0)).toEqual({
      label: 'Completed',
      tone: 'completed',
    })
  })

  it('returns Scheduled when first stop is in the future and there is no data', () => {
    const nowMinutes = 5 * 60 // 5:00 AM, before 5:30 AM first stop
    expect(computeHeroStatus('nodata', null, stops[0], nowMinutes)).toEqual({
      label: 'Scheduled',
      tone: 'scheduled',
    })
  })

  it('returns null for nodata when first stop is already past', () => {
    const nowMinutes = 7 * 60
    expect(computeHeroStatus('nodata', null, stops[0], nowMinutes)).toBeNull()
  })

  it('returns On time for active with zero/null delay', () => {
    expect(computeHeroStatus('active', null, stops[0], 0)).toEqual({
      label: 'On time',
      tone: 'ontime',
    })
    expect(computeHeroStatus('active', 0, stops[0], 0)).toEqual({
      label: 'On time',
      tone: 'ontime',
    })
  })

  it('returns Delayed label for positive delay', () => {
    expect(computeHeroStatus('active', 5, stops[0], 0)).toEqual({
      label: 'Delayed 5 min',
      tone: 'delayed',
    })
  })

  it('returns early label for negative delay', () => {
    expect(computeHeroStatus('active', -3, stops[0], 0)).toEqual({
      label: '3 min early',
      tone: 'early',
    })
  })
})
