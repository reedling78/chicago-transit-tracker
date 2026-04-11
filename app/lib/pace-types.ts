export type PaceRouteServiceType = 'pulse' | 'local' | 'express' | 'feeder'

export type PaceRegion =
  | 'north'
  | 'northwest'
  | 'west'
  | 'southwest'
  | 'south'
  | 'heritage'

export interface PaceDirection {
  id: string
  name: string
}

export interface PaceRoute {
  slug: string
  shortName: string
  longName: string
  serviceType: PaceRouteServiceType
  region: PaceRegion
  color: string
  textColor: string
  description: string | null
  directions: PaceDirection[]
}

export interface PaceStop {
  slug: string
  name: string
  lat: number
  lon: number
  routes: string[]
  wheelchairBoarding: boolean
}
