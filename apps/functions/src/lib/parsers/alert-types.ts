/**
 * Normalized alert types for the Cloud Function alert proxies.
 *
 * These interfaces must stay in sync with packages/shared/src/types.ts.
 * The functions package uses CommonJS and does not consume @ctt/shared,
 * so we maintain a local copy.
 */

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
