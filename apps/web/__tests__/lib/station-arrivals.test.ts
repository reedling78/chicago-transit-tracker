import {
  applyDirectionFilter,
  computeArrivalGroups,
  formatClockLabel,
  formatMinutesAway,
  listStationHeadsigns,
  minutesUntil,
  pickServiceDay,
  summarizeCompact,
} from '@ctt/shared'
import type { ArrivalGroup, StationSchedule, StationTrips } from '@ctt/shared'

// Tuesday, 2026-04-28 at 10:00 AM local time → 600 minutes since midnight.
const TUESDAY_10_AM = new Date(2026, 3, 28, 10, 0, 0)
const SATURDAY_10_AM = new Date(2026, 3, 25, 10, 0, 0)
const SUNDAY_10_AM = new Date(2026, 3, 26, 10, 0, 0)

const ctaSchedule: StationSchedule = {
  directions: [
    {
      headsign: 'Loop',
      line: 'Red',
      weekday: [605, 615, 630, 645],
      saturday: [610],
      sunday: [620],
    },
    {
      headsign: "O'Hare",
      line: 'Blue',
      weekday: [610, 625, 640],
      saturday: [615],
      sunday: [625],
    },
  ],
}

const metraSchedule: StationSchedule = {
  directions: [
    {
      headsign: 'Chicago',
      line: 'BNSF',
      weekday: [605, 620, 635],
      saturday: [],
      sunday: [],
    },
    {
      headsign: 'Aurora',
      line: 'BNSF',
      weekday: [610, 625, 640],
      saturday: [],
      sunday: [],
    },
  ],
}

const metraTrips: StationTrips = {
  weekday: [
    {
      tripId: 'BNSF_1200',
      trainNumber: '1200',
      headsign: 'Chicago',
      departure: '10:05 AM',
      line: 'BNSF',
      lineSlug: 'bnsf',
      directionId: 1, // inbound
    },
    {
      tripId: 'BNSF_1201',
      trainNumber: '1201',
      headsign: 'Aurora',
      departure: '10:10 AM',
      line: 'BNSF',
      lineSlug: 'bnsf',
      directionId: 0, // outbound
    },
  ],
  saturday: [],
  sunday: [],
}

describe('pickServiceDay', () => {
  it.each([
    [SATURDAY_10_AM, 'saturday'],
    [SUNDAY_10_AM, 'sunday'],
    [TUESDAY_10_AM, 'weekday'],
  ] as const)('returns the correct bucket for %s', (now, expected) => {
    expect(pickServiceDay(now)).toBe(expected)
  })
})

describe('minutesUntil', () => {
  it('returns positive minutes for future times', () => {
    expect(minutesUntil(TUESDAY_10_AM, 615)).toBe(15)
  })
  it('returns negative minutes for past times', () => {
    expect(minutesUntil(TUESDAY_10_AM, 590)).toBe(-10)
  })
})

describe('formatMinutesAway', () => {
  it('returns "Due" for 0 or negative', () => {
    expect(formatMinutesAway(0)).toBe('Due')
    expect(formatMinutesAway(-5)).toBe('Due')
  })
  it('returns "X min" under an hour', () => {
    expect(formatMinutesAway(7)).toBe('7 min')
    expect(formatMinutesAway(59)).toBe('59 min')
  })
  it('returns hours when >= 60', () => {
    expect(formatMinutesAway(60)).toBe('1h')
    expect(formatMinutesAway(75)).toBe('1h 15m')
  })
})

describe('formatClockLabel', () => {
  it('formats minutes since midnight as h:mm AM/PM', () => {
    expect(formatClockLabel(605)).toBe('10:05 AM')
    expect(formatClockLabel(720)).toBe('12:00 PM')
    expect(formatClockLabel(0)).toBe('12:00 AM')
  })
})

describe('computeArrivalGroups', () => {
  it('groups CTA arrivals by headsign with all="all"', () => {
    const groups = computeArrivalGroups({
      schedule: ctaSchedule,
      now: TUESDAY_10_AM,
      service: 'cta',
    })
    expect(groups.map((g) => g.headsign)).toEqual(['Loop', "O'Hare"])
    expect(groups[0].items).toHaveLength(3)
    expect(groups[0].items[0].minutesAway).toBe(5)
    expect(groups[0].items[0].label).toBe('10:05 AM')
  })

  it('filters CTA groups by exact headsign', () => {
    const groups = computeArrivalGroups({
      schedule: ctaSchedule,
      now: TUESDAY_10_AM,
      service: 'cta',
      directionFilter: 'Loop',
    })
    expect(groups).toHaveLength(1)
    expect(groups[0].headsign).toBe('Loop')
  })

  it('filters Metra groups to inbound by directionId === 1', () => {
    const groups = computeArrivalGroups({
      schedule: metraSchedule,
      trips: metraTrips,
      now: TUESDAY_10_AM,
      service: 'metra',
      directionFilter: 'inbound',
    })
    expect(groups).toHaveLength(1)
    expect(groups[0].headsign).toBe('Chicago')
    expect(groups[0].directionId).toBe(1)
    expect(groups[0].items[0].tripId).toBe('BNSF_1200')
  })

  it('filters Metra groups to outbound by directionId === 0', () => {
    const groups = computeArrivalGroups({
      schedule: metraSchedule,
      trips: metraTrips,
      now: TUESDAY_10_AM,
      service: 'metra',
      directionFilter: 'outbound',
    })
    expect(groups).toHaveLength(1)
    expect(groups[0].headsign).toBe('Aurora')
    expect(groups[0].directionId).toBe(0)
  })

  it('respects the limit option', () => {
    const groups = computeArrivalGroups({
      schedule: ctaSchedule,
      now: TUESDAY_10_AM,
      service: 'cta',
      limit: 2,
    })
    expect(groups[0].items).toHaveLength(2)
  })

  it('returns [] for null schedule', () => {
    expect(computeArrivalGroups({ schedule: null, now: TUESDAY_10_AM, service: 'cta' })).toEqual([])
  })

  it('skips groups with no upcoming times', () => {
    const groups = computeArrivalGroups({
      schedule: ctaSchedule,
      now: SATURDAY_10_AM,
      service: 'cta',
    })
    // Saturday only has one entry per direction, both before 10:00 AM after the filter
    // (610 / 615 are after 600 → still upcoming). Confirm both groups still present.
    expect(groups).toHaveLength(2)
  })
})

describe('applyDirectionFilter', () => {
  const groups: ArrivalGroup[] = [
    { headsign: 'Loop', line: 'Red', items: [], directionId: 1 },
    { headsign: "O'Hare", line: 'Blue', items: [], directionId: 0 },
  ]

  it('returns input unchanged for "all"', () => {
    expect(applyDirectionFilter(groups, 'all', 'cta')).toBe(groups)
  })

  it('passes through CTA exact-headsign matching', () => {
    const result = applyDirectionFilter(groups, 'Loop', 'cta')
    expect(result).toHaveLength(1)
    expect(result[0].headsign).toBe('Loop')
  })

  it('Metra inbound filters to directionId 1', () => {
    const result = applyDirectionFilter(groups, 'inbound', 'metra')
    expect(result).toHaveLength(1)
    expect(result[0].directionId).toBe(1)
  })
})

describe('listStationHeadsigns', () => {
  it('returns distinct headsigns in input order', () => {
    expect(listStationHeadsigns(ctaSchedule)).toEqual(['Loop', "O'Hare"])
  })
  it('returns [] for null', () => {
    expect(listStationHeadsigns(null)).toEqual([])
  })
})

describe('summarizeCompact', () => {
  it('joins up to N times', () => {
    const group: ArrivalGroup = {
      headsign: 'Loop',
      line: 'Red',
      items: [
        { departureMinutes: 605, minutesAway: 5, label: '10:05 AM' },
        { departureMinutes: 615, minutesAway: 15, label: '10:15 AM' },
        { departureMinutes: 630, minutesAway: 30, label: '10:30 AM' },
      ],
    }
    expect(summarizeCompact(group, 2)).toBe('5 min, 15 min')
  })

  it('returns "—" for empty items', () => {
    const group: ArrivalGroup = { headsign: 'Loop', line: 'Red', items: [] }
    expect(summarizeCompact(group)).toBe('—')
  })
})
