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
}
