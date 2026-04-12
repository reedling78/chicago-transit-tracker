import type { transit_realtime as TransitRealtimeNS } from 'gtfs-realtime-bindings'

export type FeedType = 'alerts' | 'positions' | 'tripupdates'

export type DecodedFeed = TransitRealtimeNS.IFeedMessage

/**
 * Fetch and decode a Metra GTFS Realtime feed. The protobuf decoder
 * (`gtfs-realtime-bindings`, ~1 MB) is pulled in via a dynamic import
 * so Next.js code-splits it into its own client chunk instead of
 * bundling it into the initial load for every page.
 */
export async function fetchMetraFeed(feedType: FeedType): Promise<DecodedFeed> {
  const res = await fetch(`/api/metra/${feedType}`)
  if (!res.ok) throw new Error(`Metra API error: ${res.status}`)

  const buffer = await res.arrayBuffer()
  const { transit_realtime } = await import('gtfs-realtime-bindings')
  return transit_realtime.FeedMessage.decode(new Uint8Array(buffer))
}
