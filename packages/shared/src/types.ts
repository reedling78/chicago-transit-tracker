export interface Line {
  id: string
  name: string
  shortName: string
  slug: string
  service: 'cta' | 'metra'
  color: string
  textColor: string
  termini: string[]
  stationCount: number
  routeMiles: number
  operatesOvernight: boolean
  peakFrequencyMins: number | null
  offPeakFrequencyMins: number | null
  firstTrainApprox: string | null
  lastTrainApprox: string | null
  type: 'rapid_transit' | 'commuter_rail'
  description: string
  ctaRouteId: string | null
  metraLineCode: string | null
  downtownTerminal: string | null
  operator: string | null
  countiesServed: string[]
  photoUrl: string | null
  scheduleUrl: string | null
}

export interface Station {
  id: string
  name: string
  slug: string
  address: string
  location: { latitude: number; longitude: number }
  municipality: string
  service: 'cta' | 'metra' | 'both'
  lines: string[]
  hours: { weekday: string; saturday: string; sunday: string } | null
  open24Hours: boolean
  accessibility: { ada: boolean; elevator: boolean; escalator: boolean }
  amenities: string[]
  parking: boolean
  stationType: string
  terminal: boolean
  ctaStopId: number | null
  ctaMapId: number | null
  metraStopId: string | null
  photoUrl: string | null
  wikipediaUrl: string | null
  metraLink: string | null
  /** Position of this station on each line it serves, keyed by line shortName (e.g. { "Red": 3, "Purple": 7 }) */
  lineOrder: Record<string, number>
}

export interface NormalizedAlertRoute {
  routeId: string
  routeName: string
  color: string
  textColor: string
}

export interface NormalizedAlert {
  id: string
  headline: string
  description: string
  url: string | null
  routes: NormalizedAlertRoute[]
  severity: string | null
  /** CTA `MajorAlert` flag; always false for Metra (GTFS-RT has no equivalent). */
  isMajor: boolean
  impact: string | null
  startTime: string | null
  endTime: string | null
  service: 'cta' | 'metra'
}

export type FavoriteType = 'line' | 'station' | 'train'

/**
 * Per-favorite direction filter for station cards.
 * - `'all'` — show every direction (default).
 * - `'inbound'` / `'outbound'` — Metra only; matches `directionId` 1 / 0.
 * - any other string — CTA headsign to filter to (e.g. `'Loop'`).
 */
export type FavoriteDirection = 'all' | 'inbound' | 'outbound' | string

/** Per-favorite render density for station cards. */
export type FavoriteDensity = 'compact' | 'expanded'

export interface Favorite {
  type: FavoriteType
  /**
   * For `line`: line slug (e.g. `red`, `bnsf`).
   * For `station`: station slug (e.g. `clark-lake`, `union-station-metra`).
   * For `train`: `${lineSlug}_${trainNumber}` matching the `metra-trips` doc id.
   */
  id: string
  /** ISO 8601 timestamp when the user favorited this item. */
  addedAt: string
  /**
   * User-controlled sort position. Lower = higher in the list. Set by the mobile
   * dashboard's drag-to-reorder UI; absent for items that have never been reordered
   * (which fall to the bottom of the list, ordered by `addedAt` desc within that bucket).
   */
  position?: number
  /**
   * Station-card filter. Defaults to `'all'` when omitted. Ignored for `line` /
   * `train` favorites.
   */
  directionFilter?: FavoriteDirection
  /**
   * Station-card render density. Defaults to `'expanded'` when omitted. Ignored
   * for `line` / `train` favorites.
   */
  density?: FavoriteDensity
  /**
   * Train-card origin stop override. When set, the dashboard TrainCard renders
   * the trip's segment starting at this stop (matched by `slug` against the
   * trip's `stops[]`) instead of the trip's first stop. Falls back silently if
   * the saved slug is no longer on the trip. Ignored for `line` / `station`
   * favorites.
   */
  trainOriginStopSlug?: string
  /**
   * Train-card destination stop override. Mirror of `trainOriginStopSlug` for
   * the trip's last stop.
   */
  trainDestinationStopSlug?: string
}

export interface UserProfile {
  uid: string
  email: string | null
  displayName: string | null
  photoUrl: string | null
  provider: 'apple' | 'google' | 'facebook' | 'password'
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
  /**
   * User's favorited lines, stations, and trains, sorted by `addedAt` desc.
   * Stored on Firestore as a map keyed by `favoriteKey(type, id)` for atomic
   * per-favorite writes; projected to this ordered array in app code via
   * `mapToArray()`.
   */
  favorites: Favorite[]
}
