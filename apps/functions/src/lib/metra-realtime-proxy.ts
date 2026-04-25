/**
 * Pure helper for the Metra realtime HTTP proxies.
 *
 * The protobuf decoder + converter are injected so this module can be
 * unit-tested without mocking gtfs-realtime-bindings — a notoriously
 * fiddly module to mock cleanly across the monorepo.
 */

export interface ProxyResult {
  status: number
  body: unknown
}

export interface ProxyDeps {
  /** Performs the HTTP fetch. Defaults to global `fetch`. */
  fetchFn?: typeof fetch
  /** Decodes a Uint8Array buffer into a FeedMessage instance. */
  decode: (buffer: Uint8Array) => unknown
  /** Converts a FeedMessage instance into a plain JS object suitable for JSON. */
  toObject: (feed: unknown) => unknown
}

export async function fetchAndDecodeMetraFeed(
  upstreamUrl: string,
  token: string | null,
  deps: ProxyDeps,
): Promise<ProxyResult> {
  if (!token) {
    return { status: 500, body: { error: 'METRA_API_TOKEN not configured' } }
  }
  const fetchImpl = deps.fetchFn ?? fetch
  const url = `${upstreamUrl}?api_token=${encodeURIComponent(token)}`
  const upstream = await fetchImpl(url)
  if (!upstream.ok) {
    return { status: 502, body: { error: `Metra API returned ${upstream.status}` } }
  }
  const buffer = await upstream.arrayBuffer()
  const feed = deps.decode(new Uint8Array(buffer))
  return { status: 200, body: deps.toObject(feed) }
}
