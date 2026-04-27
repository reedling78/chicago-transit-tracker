import type { ServiceType, StationSchedule, StationTrips } from './gtfs-types'
import type { FavoriteDirection } from './types'

/** A single computed arrival inside a direction group. */
export interface ArrivalItem {
  departureMinutes: number
  minutesAway: number
  /** "5:42 PM" — formatted clock time of the scheduled departure. */
  label: string
  tripId?: string
  lineSlug?: string
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
}: ComputeArrivalGroupsInput): ArrivalGroup[] {
  if (!schedule) return []

  const dayType = pickServiceDay(now)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  // Build a (headsign|line|formattedLabel) → trip metadata lookup.
  type TripMeta = { tripId: string; lineSlug: string; directionId: number }
  const tripLookup = new Map<string, TripMeta>()
  if (trips) {
    for (const entry of trips[dayType]) {
      const key = `${entry.headsign}|${entry.line}|${entry.departure}`
      tripLookup.set(key, {
        tripId: entry.tripId,
        lineSlug: entry.lineSlug,
        directionId: entry.directionId,
      })
    }
  }

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
      items.push({
        departureMinutes: t,
        minutesAway: t - nowMinutes,
        label,
        tripId: match?.tripId,
        lineSlug: match?.lineSlug,
      })
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
    return groups.filter((g) => g.directionId === wanted)
  }

  // CTA (or any non-inbound/outbound value): exact headsign match.
  return groups.filter((g) => g.headsign === directionFilter)
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
