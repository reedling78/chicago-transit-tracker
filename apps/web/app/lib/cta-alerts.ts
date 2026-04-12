export interface CTAAlertService {
  ServiceType: string
  ServiceTypeDescription: string
  ServiceName: string
  ServiceId: string
  ServiceBackColor: string
  ServiceTextColor: string
  ServiceURL: { '#cdata-section': string }
}

export interface CTAAlert {
  AlertId: string
  Headline: string
  ShortDescription: string
  FullDescription: { '#cdata-section': string }
  SeverityScore: string
  SeverityColor: string
  SeverityCSS: string
  Impact: string
  EventStart: string
  EventEnd: string | null
  TBD: string
  MajorAlert: string
  AlertURL: { '#cdata-section': string }
  ImpactedService: {
    Service: CTAAlertService | CTAAlertService[]
  }
}

const RAIL_ROUTE_IDS = new Set(['Red', 'Blue', 'Brn', 'G', 'Org', 'P', 'Pink', 'Y'])

function normalizeServices(alert: CTAAlert): CTAAlertService[] {
  const svc = alert.ImpactedService?.Service
  if (!svc) return []
  return Array.isArray(svc) ? svc : [svc]
}

export function getRailServices(alert: CTAAlert): CTAAlertService[] {
  return normalizeServices(alert).filter((s) => RAIL_ROUTE_IDS.has(s.ServiceId))
}

export async function fetchCTAAlerts(routeId?: string): Promise<CTAAlert[]> {
  const params = new URLSearchParams()
  if (routeId) params.set('routeid', routeId)

  const url = `/api/cta/alerts${params.toString() ? `?${params}` : ''}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`CTA API error: ${res.status}`)

  const json = await res.json()
  const alerts = json.CTAAlerts?.Alert
  if (!alerts) return []

  const list: CTAAlert[] = Array.isArray(alerts) ? alerts : [alerts]
  return list.filter((a) => getRailServices(a).length > 0)
}
