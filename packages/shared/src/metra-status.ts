import type { transit_realtime } from 'gtfs-realtime-bindings'

export interface TripStop {
  sequence: number
  stationName: string
  slug: string | null
  arrival: string
  departure: string
}

export type MetraServiceType = 'weekday' | 'saturday' | 'sunday'

/**
 * Shape of a `metra-trips/{lineSlug}_{trainNumber}` Firestore document.
 * Mirrors the Cloud Function parser's `TripDetail` so both web and mobile can
 * type the doc without each importing the function-side type.
 */
export interface MetraTripDetail {
  tripId: string
  trainNumber: string
  headsign: string
  line: string
  lineSlug: string
  lineName: string
  serviceType: MetraServiceType
  directionId: number
  stops: TripStop[]
  /** True for trips that skip a meaningful fraction of the line's stops. */
  isExpress?: boolean
}

export const SERVICE_LABEL: Record<MetraServiceType, string> = {
  weekday: 'Weekday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

function serviceRunsOnDay(serviceType: MetraServiceType, dayOfWeek: number): boolean {
  // dayOfWeek: 0 = Sunday … 6 = Saturday (JS Date.getDay()).
  if (serviceType === 'saturday') return dayOfWeek === 6
  if (serviceType === 'sunday') return dayOfWeek === 0
  return dayOfWeek >= 1 && dayOfWeek <= 5
}

/**
 * Human label for the next day this service type runs, relative to `now`.
 * Day-of-week approximation of GTFS service — does not account for Metra
 * holiday/special schedules. Acceptable for an at-a-glance dashboard hint.
 * Returns 'tomorrow' for the next calendar day, otherwise the weekday name.
 */
export function nextServiceRunLabel(serviceType: MetraServiceType, now: Date): string {
  for (let offset = 1; offset <= 7; offset++) {
    const candidate = new Date(now)
    candidate.setDate(candidate.getDate() + offset)
    if (serviceRunsOnDay(serviceType, candidate.getDay())) {
      if (offset === 1) return 'tomorrow'
      return candidate.toLocaleDateString('en-US', { weekday: 'long' })
    }
  }
  return 'tomorrow'
}

export type FeedMessage = transit_realtime.IFeedMessage
/** Structural alias of FeedMessage. Web's useMetraFeed exports an identical type. */
export type FeedData = FeedMessage
type FeedEntity = NonNullable<FeedMessage['entity']>[number]
export type TripUpdate = NonNullable<FeedEntity['tripUpdate']>
export type VehiclePosition = NonNullable<FeedEntity['vehicle']>

export interface RealtimeState {
  tripUpdate: TripUpdate | null
  vehiclePosition: VehiclePosition | null
  fetchedAt: number
  stopped: boolean
}

export type StopStatus = 'past' | 'current' | 'upcoming'

export interface DerivedStop {
  stop: TripStop
  status: StopStatus
  delayMinutes: number | null
  skipped: boolean
  etaEpoch: number | null
}

export type TripPhase = 'scheduled' | 'active' | 'completed' | 'nodata'

export type StatusTone = 'ontime' | 'delayed' | 'early' | 'completed' | 'scheduled' | 'nodata'

export interface HeroStatus {
  label: string
  tone: StatusTone
}

export const TONE_CLASSES: Record<StatusTone, { text: string; dot: string; pill: string }> = {
  ontime: {
    text: 'text-green-600 dark:text-green-400',
    dot: 'bg-green-500',
    pill: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  delayed: {
    text: 'text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
    pill: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  early: {
    text: 'text-green-600 dark:text-green-400',
    dot: 'bg-green-500',
    pill: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  completed: {
    text: 'text-gray-700 dark:text-gray-300',
    dot: 'bg-gray-400',
    pill: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  scheduled: {
    text: 'text-blue-600 dark:text-blue-400',
    dot: 'bg-blue-500',
    pill: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  nodata: {
    text: 'text-gray-500 dark:text-gray-400',
    dot: 'bg-gray-400',
    pill: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
}

export function longToNumber(v: number | { toNumber(): number } | null | undefined): number | null {
  if (v == null) return null
  if (typeof v === 'number') return v
  if (typeof v.toNumber === 'function') return v.toNumber()
  return null
}

export function parseDisplayTimeToMinutes(display: string): number | null {
  const match = display.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return null
  let hour = parseInt(match[1], 10)
  const minute = parseInt(match[2], 10)
  const period = match[3].toUpperCase()
  if (period === 'PM' && hour !== 12) hour += 12
  if (period === 'AM' && hour === 12) hour = 0
  return hour * 60 + minute
}

export function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

// Metra TripDescriptor.startDate is "YYYYMMDD" and our stop.arrival strings are
// "H:MM AM/PM" (time-of-day only). Combine them into an epoch-seconds timestamp
// for the scheduled arrival, so we can compare against STU.arrival.time.
export function computeScheduledEpoch(
  startDate: string | null,
  displayTime: string,
): number | null {
  if (!startDate || startDate.length !== 8) return null
  const year = parseInt(startDate.slice(0, 4), 10)
  const month = parseInt(startDate.slice(4, 6), 10) - 1
  const day = parseInt(startDate.slice(6, 8), 10)
  const tod = parseDisplayTimeToMinutes(displayTime)
  if (tod == null || Number.isNaN(year)) return null
  const d = new Date(year, month, day, Math.floor(tod / 60), tod % 60, 0, 0)
  return Math.floor(d.getTime() / 1000)
}

export function formatClockTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function isTripScheduledEndPast(stops: TripStop[], nowMinutes: number): boolean {
  const last = stops[stops.length - 1]
  if (!last) return false
  const lastMinutes = parseDisplayTimeToMinutes(last.arrival)
  if (lastMinutes == null) return false
  return lastMinutes + 15 < nowMinutes
}

export function deriveStopState(
  stops: TripStop[],
  realtime: RealtimeState | null,
): { stops: DerivedStop[]; tripDelayMinutes: number | null; phase: TripPhase } {
  const defaultStops = (): DerivedStop[] =>
    stops.map((stop) => ({
      stop,
      status: 'upcoming',
      delayMinutes: null,
      skipped: false,
      etaEpoch: null,
    }))

  if (!realtime || !realtime.tripUpdate) {
    return { stops: defaultStops(), tripDelayMinutes: null, phase: 'nodata' }
  }

  const stopTimeUpdates = realtime.tripUpdate.stopTimeUpdate ?? []
  const nonSkipped = stopTimeUpdates.filter((u) => u.scheduleRelationship !== 1)
  const sequences = nonSkipped
    .map((u) => (u.stopSequence != null ? Number(u.stopSequence) : null))
    .filter((s): s is number => s != null)
  const minUpcomingSeq = sequences.length > 0 ? Math.min(...sequences) : null

  // Metra only includes future stops in stopTimeUpdate. Empty STU list means
  // the train has completed its run.
  if (minUpcomingSeq == null) {
    return {
      stops: stops.map((stop) => ({
        stop,
        status: 'past',
        delayMinutes: null,
        skipped: false,
        etaEpoch: null,
      })),
      tripDelayMinutes: null,
      phase: 'completed',
    }
  }

  const startDate = realtime.tripUpdate.trip?.startDate ?? null

  const derived: DerivedStop[] = stops.map((stop) => {
    const stu = stopTimeUpdates.find((u) => Number(u.stopSequence) === stop.sequence)
    const skipped = stu?.scheduleRelationship === 1

    let status: StopStatus = 'upcoming'
    if (stop.sequence < minUpcomingSeq) {
      status = 'past'
    } else if (stop.sequence === minUpcomingSeq) {
      status = 'current'
    }

    let delayMinutes: number | null = null
    const stuTime = longToNumber(stu?.arrival?.time ?? stu?.departure?.time)
    if (stuTime != null) {
      const scheduled = computeScheduledEpoch(startDate, stop.arrival)
      if (scheduled != null) {
        const diffSec = stuTime - scheduled
        if (Math.abs(diffSec) <= 12 * 60 * 60) {
          delayMinutes = Math.round(diffSec / 60)
        }
      }
    }

    return { stop, status, delayMinutes, skipped, etaEpoch: stuTime }
  })

  // Trip-level delay: prefer the current stop's delay, fall back to the next
  // non-null upcoming delay.
  let tripDelayMinutes: number | null = null
  for (const d of derived) {
    if (d.status === 'past' || d.skipped) continue
    if (d.delayMinutes != null) {
      tripDelayMinutes = d.delayMinutes
      break
    }
  }

  return { stops: derived, tripDelayMinutes, phase: 'active' }
}

export function computeHeroStatus(
  phase: TripPhase,
  tripDelayMinutes: number | null,
  firstStop: TripStop | undefined,
  nowMinutes: number,
): HeroStatus | null {
  if (phase === 'completed') return { label: 'Completed', tone: 'completed' }
  if (phase === 'nodata') {
    const firstStopMin = parseDisplayTimeToMinutes(firstStop?.arrival ?? '')
    if (firstStopMin != null && firstStopMin > nowMinutes) {
      return { label: 'Scheduled', tone: 'scheduled' }
    }
    return null
  }
  if (phase === 'active') {
    if (tripDelayMinutes == null || tripDelayMinutes === 0) {
      return { label: 'On time', tone: 'ontime' }
    }
    if (tripDelayMinutes > 0) {
      return { label: `Delayed ${tripDelayMinutes} min`, tone: 'delayed' }
    }
    return { label: `${Math.abs(tripDelayMinutes)} min early`, tone: 'early' }
  }
  return null
}
