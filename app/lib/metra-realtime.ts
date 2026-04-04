import { transit_realtime } from 'gtfs-realtime-bindings'

export type FeedType = 'alerts' | 'positions' | 'tripupdates'

export async function fetchMetraFeed(feedType: FeedType) {
  const res = await fetch(`/api/metra/${feedType}`)
  if (!res.ok) throw new Error(`Metra API error: ${res.status}`)

  const buffer = await res.arrayBuffer()
  const feed = transit_realtime.FeedMessage.decode(new Uint8Array(buffer))
  return feed
}
