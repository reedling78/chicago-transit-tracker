/**
 * @jest-environment node
 */

const originalFetch = global.fetch
const originalToken = process.env.METRA_API_TOKEN

afterEach(() => {
  global.fetch = originalFetch
  if (originalToken == null) delete process.env.METRA_API_TOKEN
  else process.env.METRA_API_TOKEN = originalToken
  jest.resetModules()
})

async function loadRoute() {
  return import('@/app/api/metra/[...path]/route')
}

function makeReq(feed: string) {
  return new Request(`http://localhost/api/metra/${feed}`)
}

describe('GET /api/metra/[...path]', () => {
  it('returns 400 for paths not in the allowlist', async () => {
    process.env.METRA_API_TOKEN = 'test-token'
    const { GET } = await loadRoute()
    const res = await GET(makeReq('evil') as never, {
      params: Promise.resolve({ path: ['evil'] }),
    })
    expect(res.status).toBe(400)
  })

  it('rejects multi-segment paths even when the first segment is allowlisted', async () => {
    process.env.METRA_API_TOKEN = 'test-token'
    const { GET } = await loadRoute()
    const res = await GET(makeReq('alerts/extra') as never, {
      params: Promise.resolve({ path: ['alerts', 'extra'] }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 500 when METRA_API_TOKEN is not configured', async () => {
    delete process.env.METRA_API_TOKEN
    const { GET } = await loadRoute()
    const res = await GET(makeReq('tripupdates') as never, {
      params: Promise.resolve({ path: ['tripupdates'] }),
    })
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toContain('METRA_API_TOKEN')
  })

  it('proxies upstream and returns protobuf with the correct Content-Type', async () => {
    process.env.METRA_API_TOKEN = 'test-token'
    const buffer = new Uint8Array([1, 2, 3, 4]).buffer
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => buffer,
    }) as unknown as typeof fetch

    const { GET } = await loadRoute()
    const res = await GET(makeReq('tripupdates') as never, {
      params: Promise.resolve({ path: ['tripupdates'] }),
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/x-protobuf')

    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>
    const calledUrl = String(fetchMock.mock.calls[0][0])
    expect(calledUrl).toContain('/tripupdates')
    expect(calledUrl).toContain('api_token=test-token')
  })

  it('passes upstream error status through when Metra responds non-OK', async () => {
    process.env.METRA_API_TOKEN = 'test-token'
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'upstream boom',
    }) as unknown as typeof fetch

    const { GET } = await loadRoute()
    const res = await GET(makeReq('positions') as never, {
      params: Promise.resolve({ path: ['positions'] }),
    })
    expect(res.status).toBe(503)
  })

  it('proxies the alerts feed path', async () => {
    process.env.METRA_API_TOKEN = 'test-token'
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(4),
    }) as unknown as typeof fetch

    const { GET } = await loadRoute()
    const res = await GET(makeReq('alerts') as never, {
      params: Promise.resolve({ path: ['alerts'] }),
    })
    expect(res.status).toBe(200)

    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>
    const calledUrl = String(fetchMock.mock.calls[0][0])
    expect(calledUrl).toContain('/alerts')
  })
})
