import type { transit_realtime as TransitRealtimeNS } from 'gtfs-realtime-bindings'
import type { NormalizedAlert } from '@lib/types'

export type FeedType = 'alerts' | 'positions' | 'tripupdates'

export type DecodedFeed = TransitRealtimeNS.IFeedMessage

const FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL ?? ''

/**
 * Fetch normalized Metra alerts from the Cloud Function proxy.
 */
export async function fetchMetraAlerts(routeId?: string): Promise<NormalizedAlert[]> {
  const params = new URLSearchParams()
  if (routeId) params.set('routeId', routeId)

  const url = `${FUNCTIONS_BASE_URL}/metraAlerts${params.toString() ? `?${params}` : ''}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Metra Alerts API error: ${res.status}`)

  return res.json()
}

/**
 * Fetch and decode a Metra GTFS Realtime feed (positions or tripupdates).
 * The protobuf decoder (`gtfs-realtime-bindings`, ~1 MB) is pulled in via
 * a dynamic import so Next.js code-splits it into its own client chunk.
 */
export async function fetchMetraFeed(feedType: FeedType): Promise<DecodedFeed> {
  const res = await fetch(`/api/metra/${feedType}`)
  if (!res.ok) throw new Error(`Metra API error: ${res.status}`)

  const buffer = await res.arrayBuffer()
  const { transit_realtime } = await import('gtfs-realtime-bindings')
  return transit_realtime.FeedMessage.decode(new Uint8Array(buffer))
}
