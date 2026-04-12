/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'

const originalFetch = global.fetch

afterEach(() => {
  global.fetch = originalFetch
  jest.resetModules()
})

async function loadRoute() {
  return import('@/app/api/cta/alerts/route')
}

describe('GET /api/cta/alerts', () => {
  it('proxies to the CTA alerts endpoint with outputType=JSON and returns the body', async () => {
    const upstream = { CTAAlerts: { Alert: [{ AlertId: '42' }] } }
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => upstream,
    }) as unknown as typeof fetch

    const { GET } = await loadRoute()
    const req = new NextRequest('http://localhost/api/cta/alerts')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(upstream)

    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>
    const calledUrl = String(fetchMock.mock.calls[0][0])
    expect(calledUrl).toContain('transitchicago.com')
    expect(calledUrl).toContain('outputType=JSON')
  })

  it('forwards the routeid query param to the upstream URL', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as unknown as typeof fetch

    const { GET } = await loadRoute()
    const req = new NextRequest('http://localhost/api/cta/alerts?routeid=Red')
    await GET(req)

    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>
    const calledUrl = String(fetchMock.mock.calls[0][0])
    expect(calledUrl).toContain('routeid=Red')
  })

  it('does not forward routeid when not provided', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as unknown as typeof fetch

    const { GET } = await loadRoute()
    const req = new NextRequest('http://localhost/api/cta/alerts')
    await GET(req)

    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>
    const calledUrl = String(fetchMock.mock.calls[0][0])
    expect(calledUrl).not.toContain('routeid=')
  })

  it('passes upstream error status through when CTA responds non-OK', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => 'upstream boom',
    }) as unknown as typeof fetch

    const { GET } = await loadRoute()
    const req = new NextRequest('http://localhost/api/cta/alerts')
    const res = await GET(req)
    expect(res.status).toBe(502)
  })
})
