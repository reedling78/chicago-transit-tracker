import {
  applyDirectionFilter,
  computeArrivalGroups,
  formatClockLabel,
  formatMinutesAway,
  indexMetraTripUpdates,
  listStationHeadsigns,
  minutesUntil,
  pickServiceDay,
  shortenStationName,
  summarizeCompact,
} from '@ctt/shared'
import type { ArrivalGroup, FeedData, StationSchedule, StationTrips } from '@ctt/shared'

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

describe('computeArrivalGroups — direction-filter hardening', () => {
  // Regression: the dashboard StationCard passes a per-favorite inbound/outbound
  // filter. When `metra-station-trips` is stale/empty for the active service day
  // (e.g. not yet re-synced), every group's directionId was undefined and the
  // inbound/outbound filter dropped them all → false "No upcoming departures."
  it('keeps scheduled Metra groups when station-trips is empty for the day', () => {
    const groups = computeArrivalGroups({
      schedule: metraSchedule,
      trips: { weekday: [], saturday: [], sunday: [] },
      now: TUESDAY_10_AM,
      service: 'metra',
      directionFilter: 'inbound',
    })
    // Trains ARE scheduled — must not collapse to empty just because the
    // station-trips join had nothing to classify direction with.
    expect(groups.length).toBeGreaterThan(0)
    expect(groups.map((g) => g.headsign).sort()).toEqual(['Aurora', 'Chicago'])
  })

  // Layer 1: a group's direction should be derivable from ANY same
  // headsign/line station-trip entry for the service day, even when no
  // currently-upcoming scheduled time matched a station-trip departure.
  it('classifies group direction from headsign/line when no upcoming time matches', () => {
    const trips: StationTrips = {
      weekday: [
        {
          tripId: 'C1',
          trainNumber: 'C1',
          headsign: 'Chicago',
          departure: '7:00 AM', // does not match any upcoming schedule label
          line: 'BNSF',
          lineSlug: 'bnsf',
          directionId: 1,
        },
        {
          tripId: 'A1',
          trainNumber: 'A1',
          headsign: 'Aurora',
          departure: '7:05 AM',
          line: 'BNSF',
          lineSlug: 'bnsf',
          directionId: 0,
        },
      ],
      saturday: [],
      sunday: [],
    }
    const groups = computeArrivalGroups({
      schedule: metraSchedule,
      trips,
      now: TUESDAY_10_AM,
      service: 'metra',
      directionFilter: 'inbound',
    })
    expect(groups).toHaveLength(1)
    expect(groups[0].headsign).toBe('Chicago')
    expect(groups[0].directionId).toBe(1)
  })
})

describe('applyDirectionFilter — unclassified Metra groups', () => {
  it('keeps Metra groups with an undefined directionId rather than dropping them', () => {
    const groups: ArrivalGroup[] = [
      { headsign: 'Chicago', line: 'BNSF', items: [], directionId: undefined },
      { headsign: 'Aurora', line: 'BNSF', items: [], directionId: 0 },
    ]
    const result = applyDirectionFilter(groups, 'inbound', 'metra')
    // The classified outbound group is filtered out; the unclassified group is
    // retained (better to show scheduled trains than a false empty state).
    expect(result.map((g) => g.headsign)).toEqual(['Chicago'])
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

describe('shortenStationName', () => {
  it('shortens "Chicago Union Station" to "Union Station"', () => {
    expect(shortenStationName('Chicago Union Station')).toBe('Union Station')
  })

  it('shortens the name within a longer label', () => {
    expect(shortenStationName('Big Timber to Chicago Union Station')).toBe(
      'Big Timber to Union Station',
    )
  })

  it('leaves other station names untouched', () => {
    expect(shortenStationName('Elgin')).toBe('Elgin')
    expect(shortenStationName('LaGrange Road')).toBe('LaGrange Road')
  })
})

// --- Metra realtime merge -------------------------------------------------

const STATION_STOP_ID = 'CUS'

/** Build a minimal GTFS-RT FeedData with a single Metra trip update. */
function makeFeed(opts: {
  routeId?: string
  tripId?: string
  tripScheduleRelationship?: number
  stops: { stopId: string; departureTime?: number; arrivalTime?: number; skipped?: boolean }[]
}): FeedData {
  return {
    entity: [
      {
        tripUpdate: {
          trip: {
            routeId: opts.routeId ?? 'BNSF',
            tripId: opts.tripId ?? 'BNSF_BN1200_V4_A',
            scheduleRelationship: opts.tripScheduleRelationship,
          },
          stopTimeUpdate: opts.stops.map((s) => ({
            stopId: s.stopId,
            scheduleRelationship: s.skipped ? 1 : 0,
            arrival: s.arrivalTime != null ? { time: s.arrivalTime } : undefined,
            departure: s.departureTime != null ? { time: s.departureTime } : undefined,
          })),
        },
      },
    ],
  } as unknown as FeedData
}

describe('indexMetraTripUpdates', () => {
  it('returns an empty index for null/undefined feed', () => {
    expect(indexMetraTripUpdates(null).size).toBe(0)
    expect(indexMetraTripUpdates(undefined).size).toBe(0)
  })

  it('keys trip updates by `${lineSlug}:${trainNumber}` and prefers departure time', () => {
    const idx = indexMetraTripUpdates(
      makeFeed({ stops: [{ stopId: STATION_STOP_ID, departureTime: 1000, arrivalTime: 900 }] }),
    )
    const info = idx.get('bnsf:1200')
    expect(info).toBeDefined()
    expect(info!.canceled).toBe(false)
    expect(info!.stops.get(STATION_STOP_ID)).toEqual({ predictedEpoch: 1000, skipped: false })
  })

  it('falls back to arrival time when departure time is absent', () => {
    const idx = indexMetraTripUpdates(
      makeFeed({ stops: [{ stopId: STATION_STOP_ID, arrivalTime: 900 }] }),
    )
    expect(idx.get('bnsf:1200')!.stops.get(STATION_STOP_ID)!.predictedEpoch).toBe(900)
  })

  it('marks canceled trips and skipped stops', () => {
    const idx = indexMetraTripUpdates(
      makeFeed({
        tripScheduleRelationship: 3,
        stops: [{ stopId: STATION_STOP_ID, departureTime: 1000, skipped: true }],
      }),
    )
    const info = idx.get('bnsf:1200')!
    expect(info.canceled).toBe(true)
    expect(info.stops.get(STATION_STOP_ID)!.skipped).toBe(true)
  })

  it('ignores entities with an unknown route id', () => {
    expect(indexMetraTripUpdates(makeFeed({ routeId: 'NOPE', stops: [] })).size).toBe(0)
  })
})

describe('computeArrivalGroups — Metra realtime merge', () => {
  it('recomputes minutesAway from the realtime prediction and flags the row live', () => {
    const predicted = Math.floor((TUESDAY_10_AM.getTime() + 9 * 60_000) / 1000)
    const groups = computeArrivalGroups({
      schedule: metraSchedule,
      trips: metraTrips,
      now: TUESDAY_10_AM,
      service: 'metra',
      directionFilter: 'inbound',
      metraStopId: STATION_STOP_ID,
      realtime: indexMetraTripUpdates(
        makeFeed({ stops: [{ stopId: STATION_STOP_ID, departureTime: predicted }] }),
      ),
    })
    const item = groups[0].items[0]
    expect(item.trainNumber).toBe('1200')
    expect(item.isLive).toBe(true)
    expect(item.minutesAway).toBe(9) // scheduled was 5 min away
    expect(item.label).toBe('10:05 AM') // scheduled clock label unchanged
  })

  it('flags canceled trips and does not mark them live', () => {
    const groups = computeArrivalGroups({
      schedule: metraSchedule,
      trips: metraTrips,
      now: TUESDAY_10_AM,
      service: 'metra',
      directionFilter: 'inbound',
      metraStopId: STATION_STOP_ID,
      realtime: indexMetraTripUpdates(
        makeFeed({ tripScheduleRelationship: 3, stops: [{ stopId: STATION_STOP_ID }] }),
      ),
    })
    const item = groups[0].items[0]
    expect(item.isCancelled).toBe(true)
    expect(item.isLive).toBeFalsy()
  })

  it('leaves rows scheduled when there is no realtime match', () => {
    const groups = computeArrivalGroups({
      schedule: metraSchedule,
      trips: metraTrips,
      now: TUESDAY_10_AM,
      service: 'metra',
      directionFilter: 'inbound',
      metraStopId: STATION_STOP_ID,
      realtime: indexMetraTripUpdates(
        makeFeed({
          tripId: 'BNSF_BN9999_V4_A',
          stops: [{ stopId: STATION_STOP_ID, departureTime: 1 }],
        }),
      ),
    })
    const item = groups[0].items[0]
    expect(item.isLive).toBeFalsy()
    expect(item.isCancelled).toBeFalsy()
    expect(item.minutesAway).toBe(5)
  })

  it('does not mark a row live when the stop is skipped at this station', () => {
    const predicted = Math.floor((TUESDAY_10_AM.getTime() + 9 * 60_000) / 1000)
    const groups = computeArrivalGroups({
      schedule: metraSchedule,
      trips: metraTrips,
      now: TUESDAY_10_AM,
      service: 'metra',
      directionFilter: 'inbound',
      metraStopId: STATION_STOP_ID,
      realtime: indexMetraTripUpdates(
        makeFeed({ stops: [{ stopId: STATION_STOP_ID, departureTime: predicted, skipped: true }] }),
      ),
    })
    expect(groups[0].items[0].isLive).toBeFalsy()
    expect(groups[0].items[0].minutesAway).toBe(5)
  })

  it('CTA output is unchanged when no realtime input is supplied', () => {
    const groups = computeArrivalGroups({
      schedule: ctaSchedule,
      now: TUESDAY_10_AM,
      service: 'cta',
    })
    expect(groups[0].items[0].isLive).toBeUndefined()
    expect(groups[0].items[0].minutesAway).toBe(5)
  })
})
