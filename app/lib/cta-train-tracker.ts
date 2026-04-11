export interface CtaTrain {
  rn: string // run number
  destSt: string // destination station id
  destNm: string // destination station name
  trDr: string // direction ("1" or "5")
  nextStaId: string
  nextStaNm: string
  prdt: string // ISO-ish "2026-04-11T08:00:00"
  arrT: string // ISO-ish predicted arrival at next station
  isApp: '0' | '1' // approaching
  isDly: '0' | '1' // delayed
  lat: string
  lon: string
  heading: string
}

export interface CtaRouteGroup {
  '@name': string
  train?: CtaTrain | CtaTrain[]
}

export interface CtaTrainLocationsResponse {
  ctatt: {
    tmst?: string
    errCd?: string
    errNm?: string | null
    route: CtaRouteGroup[]
  }
}

// Normalized shape: route.train is always an array (upstream returns a single
// object when only one train is present, per XML-style serialization).
export interface NormalizedCtaRouteGroup {
  '@name': string
  train: CtaTrain[]
}

export interface NormalizedCtaTrainLocationsResponse {
  ctatt: {
    tmst?: string
    errCd?: string
    errNm?: string | null
    route: NormalizedCtaRouteGroup[]
  }
}

export async function fetchCtaTrainLocations(
  rt: string,
): Promise<NormalizedCtaTrainLocationsResponse> {
  const res = await fetch(`/api/cta/train-locations?rt=${encodeURIComponent(rt)}`)
  if (!res.ok) throw new Error(`CTA API error: ${res.status}`)
  const raw = (await res.json()) as CtaTrainLocationsResponse

  const route = (raw.ctatt?.route ?? []).map((r) => ({
    '@name': r['@name'],
    train: r.train == null ? [] : Array.isArray(r.train) ? r.train : [r.train],
  }))
  return { ctatt: { ...raw.ctatt, route } }
}
