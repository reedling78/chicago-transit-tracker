import { fetchCTAAlerts } from '@lib/cta-alerts'
import type { NormalizedAlert } from '@lib/types'

const mockAlert: NormalizedAlert = {
  id: '1',
  headline: 'Red Line Delays',
  description: 'Expect delays',
  url: 'https://transitchicago.com/alert/1',
  routes: [{ routeId: 'Red', routeName: 'Red Line', color: '#c60c30', textColor: '#ffffff' }],
  severity: '25',
  impact: 'Planned Work',
  startTime: '2026-04-01T00:00:00',
  endTime: null,
  service: 'cta',
}

const originalFetch = global.fetch

beforeEach(() => {
  jest.clearAllMocks()
})

afterEach(() => {
  global.fetch = originalFetch
})

describe('fetchCTAAlerts', () => {
  it('fetches from the Cloud Function endpoint', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([mockAlert]),
    })

    const result = await fetchCTAAlerts()
    expect(global.fetch).toHaveBeenCalledWith('/ctaAlerts')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('passes routeId query param when provided', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    await fetchCTAAlerts('Red')
    expect(global.fetch).toHaveBeenCalledWith('/ctaAlerts?routeId=Red')
  })

  it('returns NormalizedAlert array', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([mockAlert]),
    })

    const result = await fetchCTAAlerts()
    expect(result[0].headline).toBe('Red Line Delays')
    expect(result[0].routes[0].routeId).toBe('Red')
    expect(result[0].service).toBe('cta')
  })

  it('throws on HTTP error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    })

    await expect(fetchCTAAlerts()).rejects.toThrow('CTA Alerts API error: 500')
  })
})
