import type { ServiceType, StationSchedule, StationTrips } from './gtfs-types'
import type { FavoriteDirection } from './types'
import type { FeedData } from './metra-status'
import { longToNumber } from './metra-status'
import { extractMetraTrainNumber, routeIdToLineSlug } from './metra-trip-matching'

/** A single computed arrival inside a direction group. */
export interface ArrivalItem {
  departureMinutes: number
  minutesAway: number
  /** "5:42 PM" — formatted clock time of the scheduled departure. */
  label: string
  tripId?: string
  lineSlug?: string
  trainNumber?: string
  /** True when `minutesAway` was recomputed from a Metra realtime prediction. */
  isLive?: boolean
  /** True when the matched Metra trip is canceled in the realtime feed. */
  isCancelled?: boolean
}

/** Realtime info for one Metra trip, keyed inside {@link MetraRealtimeIndex}. */
export interface RealtimeTripStop {
  /** Predicted epoch (seconds) for this stop — departure preferred, else arrival. */
  predictedEpoch: number | null
  skipped: boolean
}

export interface RealtimeTripInfo {
  canceled: boolean
  /** Keyed by GTFS `stop_id` (for Metra, the station's `metraStopId`). */
  stops: Map<string, RealtimeTripStop>
}

/** Index of Metra trip updates keyed by `${lineSlug}:${trainNumber}`. */
export type MetraRealtimeIndex = Map<string, RealtimeTripInfo>

// GTFS-RT ScheduleRelationship enum values we care about.
const STU_SKIPPED = 1
const TRIP_CANCELED = 3

/**
 * One-pass normalizer: turn a decoded Metra GTFS-RT trip-updates feed into a
 * lookup keyed by `${lineSlug}:${trainNumber}`. Pure + platform-agnostic so
 * web and mobile feed `computeArrivalGroups` the same shape.
 */
export function indexMetraTripUpdates(
  feed: FeedData | null | undefined,
): MetraRealtimeIndex {
  const index: MetraRealtimeIndex = new Map()
  if (!feed?.entity) return index

  for (const entity of feed.entity) {
    const tu = entity.tripUpdate
    if (!tu?.trip) continue
    const lineSlug = routeIdToLineSlug(tu.trip.routeId ?? null)
    const tripId = tu.trip.tripId
    if (!lineSlug || !tripId) continue

    const trainNumber = extractMetraTrainNumber(tripId)
    const stops = new Map<string, RealtimeTripStop>()
    for (const stu of tu.stopTimeUpdate ?? []) {
      if (!stu.stopId) continue
      stops.set(stu.stopId, {
        predictedEpoch: longToNumber(stu.departure?.time ?? stu.arrival?.time),
        skipped: stu.scheduleRelationship === STU_SKIPPED,
      })
    }
    index.set(`${lineSlug}:${trainNumber}`, {
      canceled: tu.trip.scheduleRelationship === TRIP_CANCELED,
      stops,
    })
  }

  return index
}

/** A group of arrivals sharing a headsign + line. */
export interface ArrivalGroup {
  headsign: string
  line: string
  items: ArrivalItem[]
  /** The Metra `directionId` if the group's trips were matched to a station-trip entry. */
  directionId?: number
}

export interface ComputeArrivalGroupsInput {
  schedule: StationSchedule | null | undefined
  trips?: StationTrips | null
  now: Date
  service: 'cta' | 'metra'
  /** Filter applied to the resulting groups; defaults to `'all'`. */
  directionFilter?: FavoriteDirection
  /** Max arrivals returned per direction group. Defaults to 3. */
  limit?: number
  /** Normalized Metra realtime trip updates (see {@link indexMetraTripUpdates}). */
  realtime?: MetraRealtimeIndex | null
  /** This station's GTFS `stop_id` (`Station.metraStopId`); required to merge realtime. */
  metraStopId?: string | null
}

export function pickServiceDay(now: Date): ServiceType {
  const day = now.getDay()
  if (day === 0) return 'sunday'
  if (day === 6) return 'saturday'
  return 'weekday'
}

export function minutesUntil(now: Date, minutesSinceMidnight: number): number {
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  return minutesSinceMidnight - nowMinutes
}

export function formatMinutesAway(minutesAway: number): string {
  if (minutesAway < 1) return 'Due'
  if (minutesAway < 60) return `${minutesAway} min`
  const hours = Math.floor(minutesAway / 60)
  const mins = minutesAway % 60
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`
}

/**
 * Display-name shortener for compact surfaces (dashboard cards). Trims the
 * redundant "Chicago " prefix from "Chicago Union Station" — the city is
 * implicit on a Chicago transit app and the long form crowds tight rows.
 */
export function shortenStationName(name: string): string {
  return name.replace(/\bChicago Union Station\b/g, 'Union Station')
}

export function formatClockLabel(minutesSinceMidnight: number): string {
  const h = Math.floor(minutesSinceMidnight / 60) % 24
  const m = minutesSinceMidnight % 60
  const period = h < 12 ? 'AM' : 'PM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

/**
 * Pure helper that turns a `StationSchedule` (and optional Metra `StationTrips`)
 * into an ordered list of arrival groups, applying the per-favorite direction
 * filter. Web and mobile call this so the rendered output stays in sync.
 */
export function computeArrivalGroups({
  schedule,
  trips,
  now,
  service,
  directionFilter = 'all',
  limit = 3,
  realtime,
  metraStopId,
}: ComputeArrivalGroupsInput): ArrivalGroup[] {
  if (!schedule) return []

  const dayType = pickServiceDay(now)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  // Build a (headsign|line|formattedLabel) → trip metadata lookup.
  type TripMeta = { tripId: string; lineSlug: string; trainNumber: string; directionId: number }
  const tripLookup = new Map<string, TripMeta>()
  // All trips for a headsign/line on a service day share a direction, so this
  // lets a group's direction be resolved even when no currently-upcoming
  // scheduled time lines up with a station-trip departure (stale/partial sync).
  const dirByHeadsignLine = new Map<string, number>()
  if (trips) {
    for (const entry of trips[dayType]) {
      const key = `${entry.headsign}|${entry.line}|${entry.departure}`
      tripLookup.set(key, {
        tripId: entry.tripId,
        lineSlug: entry.lineSlug,
        trainNumber: entry.trainNumber,
        directionId: entry.directionId,
      })
      const dirKey = `${entry.headsign}|${entry.line}`
      if (!dirByHeadsignLine.has(dirKey)) dirByHeadsignLine.set(dirKey, entry.directionId)
    }
  }

  const canMergeRealtime = service === 'metra' && Boolean(realtime) && Boolean(metraStopId)

  const groups: ArrivalGroup[] = []

  for (const dir of schedule.directions) {
    const times = dir[dayType] ?? []
    const upcoming = times.filter((t) => t > nowMinutes).slice(0, limit)
    if (upcoming.length === 0) continue

    const items: ArrivalItem[] = []
    let groupDirectionId: number | undefined

    for (const t of upcoming) {
      const label = formatClockLabel(t)
      const match = tripLookup.get(`${dir.headsign}|${dir.line}|${label}`)
      if (match && groupDirectionId === undefined) groupDirectionId = match.directionId

      const item: ArrivalItem = {
        departureMinutes: t,
        minutesAway: t - nowMinutes,
        label,
        tripId: match?.tripId,
        lineSlug: match?.lineSlug,
        trainNumber: match?.trainNumber,
      }

      if (canMergeRealtime && match?.lineSlug && match.trainNumber) {
        const rt = realtime!.get(`${match.lineSlug}:${match.trainNumber}`)
        if (rt?.canceled) {
          item.isCancelled = true
        } else {
          const stop = rt?.stops.get(metraStopId!)
          if (stop && !stop.skipped && stop.predictedEpoch != null) {
            item.minutesAway = Math.round((stop.predictedEpoch * 1000 - now.getTime()) / 60_000)
            item.isLive = true
          }
        }
      }

      items.push(item)
    }

    if (groupDirectionId === undefined) {
      groupDirectionId = dirByHeadsignLine.get(`${dir.headsign}|${dir.line}`)
    }

    groups.push({
      headsign: dir.headsign,
      line: dir.line,
      items,
      directionId: groupDirectionId,
    })
  }

  groups.sort((a, b) => a.headsign.localeCompare(b.headsign))

  return applyDirectionFilter(groups, directionFilter, service)
}

export function applyDirectionFilter(
  groups: ArrivalGroup[],
  directionFilter: FavoriteDirection,
  service: 'cta' | 'metra',
): ArrivalGroup[] {
  if (!directionFilter || directionFilter === 'all') return groups

  if (service === 'metra' && (directionFilter === 'inbound' || directionFilter === 'outbound')) {
    const wanted = directionFilter === 'inbound' ? 1 : 0
    // Keep groups we couldn't classify (directionId undefined) instead of
    // dropping them. If station-trips is entirely missing for the day this
    // shows both directions rather than a false "No upcoming departures."; it
    // self-corrects on the next successful sync.
    return groups.filter((g) => g.directionId === wanted || g.directionId === undefined)
  }

  // CTA (or any non-inbound/outbound value): exact headsign match.
  return groups.filter((g) => g.headsign === directionFilter)
}

/**
 * Subheader string for a dashboard station card: the service name followed by
 * the station's line names. CTA gets a single trailing "Line" (e.g.
 * "CTA Blue Line", "CTA Blue • Pink Line"); Metra does not ("Metra MD-W").
 */
export function stationCardSubheader(
  service: 'metra' | 'cta',
  lineNames: string[],
): string {
  const svc = service === 'metra' ? 'Metra' : 'CTA'
  if (lineNames.length === 0) return svc
  const joined = lineNames.join(' • ')
  return service === 'metra' ? `${svc} ${joined}` : `${svc} ${joined} Line`
}

/**
 * Distinct headsigns served by a station, derived from a schedule. Used to
 * populate the CTA chip list in the favorite-card menu.
 */
export function listStationHeadsigns(schedule: StationSchedule | null | undefined): string[] {
  if (!schedule) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const dir of schedule.directions) {
    if (!seen.has(dir.headsign)) {
      seen.add(dir.headsign)
      out.push(dir.headsign)
    }
  }
  return out
}

/**
 * Compact representation of a group's next N times, joined for single-line
 * display. Returns "—" when the group has no upcoming items.
 */
export function summarizeCompact(group: ArrivalGroup, perGroup = 2): string {
  if (group.items.length === 0) return '—'
  return group.items
    .slice(0, perGroup)
    .map((item) => formatMinutesAway(item.minutesAway))
    .join(', ')
}
