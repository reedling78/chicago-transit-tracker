/**
 * Tests for the Metra realtime HTTP proxy helper used by the
 * metraTripUpdates and metraPositions Cloud Functions.
 *
 * Targets the injectable helper at apps/functions/src/lib/metra-realtime-proxy.ts
 * so we don't need to mock gtfs-realtime-bindings (which is awkward across the
 * monorepo's hoisted node_modules layout).
 */

import { fetchAndDecodeMetraFeed } from '../../../functions/src/lib/metra-realtime-proxy'

const UPSTREAM = 'https://gtfspublic.metrarr.com/gtfs/public/tripupdates'

const decode = jest.fn((_: Uint8Array) => ({ entity: [{ id: 'mocked' }] }))
const toObject = jest.fn((feed: unknown) => ({
  entity: [{ id: 'mocked', tripUpdate: { trip: {} } }],
  __from: feed,
}))

beforeEach(() => {
  decode.mockClear()
  toObject.mockClear()
})

describe('fetchAndDecodeMetraFeed', () => {
  it('returns 500 when token is null', async () => {
    const fetchFn = jest.fn() as unknown as typeof fetch
    const result = await fetchAndDecodeMetraFeed(UPSTREAM, null, { fetchFn, decode, toObject })
    expect(result.status).toBe(500)
    expect(result.body).toEqual({ error: 'METRA_API_TOKEN not configured' })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('returns 500 when token is empty string', async () => {
    const fetchFn = jest.fn() as unknown as typeof fetch
    const result = await fetchAndDecodeMetraFeed(UPSTREAM, '', { fetchFn, decode, toObject })
    expect(result.status).toBe(500)
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('attaches api_token to the upstream URL', async () => {
    const fetchFn = jest.fn(async () => ({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    })) as unknown as typeof fetch
    await fetchAndDecodeMetraFeed(UPSTREAM, 'sekret', { fetchFn, decode, toObject })
    expect(fetchFn).toHaveBeenCalledTimes(1)
    const url = (fetchFn as jest.Mock).mock.calls[0][0] as string
    expect(url).toContain(UPSTREAM)
    expect(url).toContain('api_token=sekret')
  })

  it('url-encodes the token', async () => {
    const fetchFn = jest.fn(async () => ({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    })) as unknown as typeof fetch
    await fetchAndDecodeMetraFeed(UPSTREAM, 'a/b+c', { fetchFn, decode, toObject })
    const url = (fetchFn as jest.Mock).mock.calls[0][0] as string
    expect(url).toContain('api_token=a%2Fb%2Bc')
  })

  it('returns 502 when upstream is non-OK', async () => {
    const fetchFn = jest.fn(async () => ({
      ok: false,
      status: 503,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    })) as unknown as typeof fetch
    const result = await fetchAndDecodeMetraFeed(UPSTREAM, 'token', {
      fetchFn,
      decode,
      toObject,
    })
    expect(result.status).toBe(502)
    expect(result.body).toEqual({ error: 'Metra API returned 503' })
    expect(decode).not.toHaveBeenCalled()
    expect(toObject).not.toHaveBeenCalled()
  })

  it('decodes the body and returns 200 with the toObject result on happy path', async () => {
    const buffer = new ArrayBuffer(16)
    const fetchFn = jest.fn(async () => ({
      ok: true,
      arrayBuffer: () => Promise.resolve(buffer),
    })) as unknown as typeof fetch
    const result = await fetchAndDecodeMetraFeed(UPSTREAM, 'token', {
      fetchFn,
      decode,
      toObject,
    })
    expect(result.status).toBe(200)
    expect(decode).toHaveBeenCalledTimes(1)
    expect(decode.mock.calls[0][0]).toBeInstanceOf(Uint8Array)
    expect(toObject).toHaveBeenCalledTimes(1)
    // The toObject output is what becomes the response body verbatim.
    expect(result.body).toEqual({
      entity: [{ id: 'mocked', tripUpdate: { trip: {} } }],
      __from: { entity: [{ id: 'mocked' }] },
    })
  })

  it('propagates fetch errors to the caller', async () => {
    const fetchFn = jest.fn(async () => {
      throw new Error('network down')
    }) as unknown as typeof fetch
    await expect(
      fetchAndDecodeMetraFeed(UPSTREAM, 'token', { fetchFn, decode, toObject }),
    ).rejects.toThrow('network down')
  })

  it('falls back to global fetch when fetchFn is omitted', async () => {
    const original = global.fetch
    const fakeGlobal = jest.fn(async () => ({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    })) as unknown as typeof fetch
    global.fetch = fakeGlobal
    try {
      const result = await fetchAndDecodeMetraFeed(UPSTREAM, 'token', { decode, toObject })
      expect(fakeGlobal).toHaveBeenCalledTimes(1)
      expect(result.status).toBe(200)
    } finally {
      global.fetch = original
    }
  })
})
