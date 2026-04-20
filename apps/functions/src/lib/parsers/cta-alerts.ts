/**
 * Pure normalizer for CTA Customer Alerts API responses.
 *
 * Accepts the raw JSON from transitchicago.com/api/1.0/alerts.aspx,
 * filters to rail-only alerts, flattens CDATA fields, and returns
 * a clean NormalizedAlert[] array.
 */

import type { NormalizedAlert, NormalizedAlertRoute } from './alert-types'
import { RAIL_ROUTE_IDS, CTA_ROUTE_ID_TO_NAME } from '../alert-constants'

// ---------------------------------------------------------------------------
// Raw CTA API types (subset of the XML-to-JSON response)
// ---------------------------------------------------------------------------

interface RawService {
  ServiceType: string
  ServiceTypeDescription: string
  ServiceName: string
  ServiceId: string
  ServiceBackColor: string
  ServiceTextColor: string
  ServiceURL: { '#cdata-section': string }
}

interface RawAlert {
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
    Service: RawService | RawService[]
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeServices(alert: RawAlert): RawService[] {
  const svc = alert.ImpactedService?.Service
  if (!svc) return []
  return Array.isArray(svc) ? svc : [svc]
}

function getRailServices(alert: RawAlert): RawService[] {
  return normalizeServices(alert).filter((s) => RAIL_ROUTE_IDS.has(s.ServiceId))
}

function toRoute(svc: RawService): NormalizedAlertRoute {
  return {
    routeId: svc.ServiceId,
    routeName: CTA_ROUTE_ID_TO_NAME[svc.ServiceId] ?? svc.ServiceName,
    color: `#${svc.ServiceBackColor}`,
    textColor: `#${svc.ServiceTextColor}`,
  }
}

function extractCdata(field: { '#cdata-section': string } | string | undefined | null): string {
  if (!field) return ''
  if (typeof field === 'string') return field
  return field['#cdata-section'] ?? ''
}

// ---------------------------------------------------------------------------
// Main normalizer
// ---------------------------------------------------------------------------

export function normalizeCtaAlerts(
  rawJson: Record<string, unknown>,
  routeId?: string,
): NormalizedAlert[] {
  const alertsRaw = (rawJson as { CTAAlerts?: { Alert?: RawAlert | RawAlert[] } }).CTAAlerts?.Alert
  if (!alertsRaw) return []

  const list: RawAlert[] = Array.isArray(alertsRaw) ? alertsRaw : [alertsRaw]

  const normalized: NormalizedAlert[] = []

  for (const raw of list) {
    const railServices = getRailServices(raw)
    if (railServices.length === 0) continue

    if (routeId && !railServices.some((s) => s.ServiceId === routeId)) continue

    normalized.push({
      id: raw.AlertId,
      headline: raw.Headline ?? '',
      description: raw.ShortDescription ?? '',
      url: extractCdata(raw.AlertURL) || null,
      routes: railServices.map(toRoute),
      severity: raw.SeverityScore ?? null,
      impact: raw.Impact ?? null,
      startTime: raw.EventStart ?? null,
      endTime: raw.EventEnd ?? null,
      service: 'cta',
    })
  }

  return normalized
}
