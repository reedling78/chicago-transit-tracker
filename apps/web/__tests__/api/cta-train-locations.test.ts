/**
 * @jest-environment node
 */

const originalFetch = global.fetch
const originalKey = process.env.CTA_TRAIN_TRACKER_KEY

afterEach(() => {
  global.fetch = originalFetch
  if (originalKey == null) delete process.env.CTA_TRAIN_TRACKER_KEY
  else process.env.CTA_TRAIN_TRACKER_KEY = originalKey
  jest.resetModules()
})

describe('GET /api/cta/train-locations', () => {
  it('returns 400 when rt query param is missing', async () => {
    process.env.CTA_TRAIN_TRACKER_KEY = 'test-key'
    const { GET } = await import('@/app/api/cta/train-locations/route')
    const req = new Request('http://localhost/api/cta/train-locations')
    const res = await GET(req as never)
    expect(res.status).toBe(400)
  })

  it('returns 400 when rt is not in the allowlist', async () => {
    process.env.CTA_TRAIN_TRACKER_KEY = 'test-key'
    const { GET } = await import('@/app/api/cta/train-locations/route')
    const req = new Request('http://localhost/api/cta/train-locations?rt=evil')
    const res = await GET(req as never)
    expect(res.status).toBe(400)
  })

  it('returns dev fallback when CTA_TRAIN_TRACKER_KEY is missing', async () => {
    delete process.env.CTA_TRAIN_TRACKER_KEY
    const { GET } = await import('@/app/api/cta/train-locations/route')
    const req = new Request('http://localhost/api/cta/train-locations?rt=red')
    const res = await GET(req as never)
    expect(res.status).toBe(200)
    expect(res.headers.get('x-dev-fallback')).toBe('1')
    const body = await res.json()
    expect(body.ctatt).toBeDefined()
  })

  it('proxies upstream when key is present and returns JSON with cache headers', async () => {
    process.env.CTA_TRAIN_TRACKER_KEY = 'test-key'
    const upstream = { ctatt: { route: [{ '@name': 'red', train: [] }] } }
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => upstream,
    }) as unknown as typeof fetch

    const { GET } = await import('@/app/api/cta/train-locations/route')
    const req = new Request('http://localhost/api/cta/train-locations?rt=red')
    const res = await GET(req as never)

    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toContain('s-maxage=20')
    const body = await res.json()
    expect(body).toEqual(upstream)

    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>
    const calledUrl = String(fetchMock.mock.calls[0][0])
    expect(calledUrl).toContain('ttpositions.aspx')
    expect(calledUrl).toContain('key=test-key')
    expect(calledUrl).toContain('rt=red')
    expect(calledUrl).toContain('outputType=JSON')
  })

  it('returns 502 when upstream errors', async () => {
    process.env.CTA_TRAIN_TRACKER_KEY = 'test-key'
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'boom',
    }) as unknown as typeof fetch

    const { GET } = await import('@/app/api/cta/train-locations/route')
    const req = new Request('http://localhost/api/cta/train-locations?rt=red')
    const res = await GET(req as never)
    expect(res.status).toBe(502)
  })
})
