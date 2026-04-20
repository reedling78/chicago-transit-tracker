import type { NormalizedAlert } from '@lib/types'

const FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL ?? ''

export async function fetchCTAAlerts(routeId?: string): Promise<NormalizedAlert[]> {
  const params = new URLSearchParams()
  if (routeId) params.set('routeId', routeId)

  const url = `${FUNCTIONS_BASE_URL}/ctaAlerts${params.toString() ? `?${params}` : ''}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`CTA Alerts API error: ${res.status}`)

  return res.json()
}
