/**
 * Shared TypeScript types for GTFS-derived data consumed by the frontend.
 *
 * These match the shape of the documents written to Firestore by the
 * syncCtaGtfs / syncMetraGtfs Cloud Functions. The canonical server-side
 * definitions live in functions/src/lib/gtfs-utils.ts — keep them in sync.
 */

export type ServiceType = 'weekday' | 'saturday' | 'sunday'

export interface DirectionSchedule {
  headsign: string
  line: string
  weekday: number[]
  saturday: number[]
  sunday: number[]
}

export interface StationSchedule {
  directions: DirectionSchedule[]
}

export interface StationTripEntry {
  tripId: string
  trainNumber: string
  headsign: string
  departure: string
  line: string
  lineSlug: string
  directionId: number
}

export interface StationTrips {
  weekday: StationTripEntry[]
  saturday: StationTripEntry[]
  sunday: StationTripEntry[]
}
