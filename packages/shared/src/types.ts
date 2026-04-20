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
  impact: string | null
  startTime: string | null
  endTime: string | null
  service: 'cta' | 'metra'
}

export interface UserProfile {
  uid: string
  email: string | null
  displayName: string | null
  photoUrl: string | null
  provider: 'apple' | 'google' | 'facebook' | 'password'
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}
