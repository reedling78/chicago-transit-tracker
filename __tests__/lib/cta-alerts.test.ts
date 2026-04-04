import { fetchCTAAlerts, getRailServices } from '@/app/lib/cta-alerts'
import type { CTAAlert } from '@/app/lib/cta-alerts'

beforeEach(() => {
  jest.clearAllMocks()
})

function makeAlert(
  id: string,
  services: { ServiceId: string; ServiceName: string }[],
  headline = 'Test Alert',
): CTAAlert {
  return {
    AlertId: id,
    Headline: headline,
    ShortDescription: 'Test description',
    FullDescription: { '#cdata-section': '<p>Test</p>' },
    SeverityScore: '25',
    SeverityColor: '#ff0000',
    SeverityCSS: 'planned',
    Impact: 'Planned Work',
    EventStart: '2026-04-01T00:00:00',
    EventEnd: null,
    TBD: '0',
    MajorAlert: '1',
    AlertURL: { '#cdata-section': 'https://transitchicago.com/alert' },
    ImpactedService: {
      Service: services.map((s) => ({
        ServiceType: 'R',
        ServiceTypeDescription: 'Route',
        ServiceName: s.ServiceName,
        ServiceId: s.ServiceId,
        ServiceBackColor: '#c60c30',
        ServiceTextColor: '#ffffff',
        ServiceURL: { '#cdata-section': 'https://transitchicago.com' },
      })),
    },
  }
}

describe('getRailServices', () => {
  it('returns rail services from an alert', () => {
    const alert = makeAlert('1', [
      { ServiceId: 'Red', ServiceName: 'Red Line' },
      { ServiceId: '22', ServiceName: 'Clark' },
    ])
    const rail = getRailServices(alert)
    expect(rail).toHaveLength(1)
    expect(rail[0].ServiceId).toBe('Red')
  })

  it('handles single service object (not array)', () => {
    const alert = makeAlert('1', [{ ServiceId: 'Blue', ServiceName: 'Blue Line' }])
    // Simulate CTA API returning a single object instead of array
    alert.ImpactedService.Service = (alert.ImpactedService.Service as unknown[])[0] as never
    const rail = getRailServices(alert)
    expect(rail).toHaveLength(1)
    expect(rail[0].ServiceId).toBe('Blue')
  })

  it('returns empty array for bus-only alerts', () => {
    const alert = makeAlert('1', [{ ServiceId: '22', ServiceName: 'Clark' }])
    expect(getRailServices(alert)).toHaveLength(0)
  })
})

describe('fetchCTAAlerts', () => {
  it('fetches from /api/cta/alerts', async () => {
    const alerts = [makeAlert('1', [{ ServiceId: 'Red', ServiceName: 'Red Line' }])]
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ CTAAlerts: { Alert: alerts } }),
    })

    const result = await fetchCTAAlerts()
    expect(global.fetch).toHaveBeenCalledWith('/api/cta/alerts')
    expect(result).toHaveLength(1)
    expect(result[0].AlertId).toBe('1')
  })

  it('passes routeid query param when provided', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ CTAAlerts: { Alert: [] } }),
    })

    await fetchCTAAlerts('Red')
    expect(global.fetch).toHaveBeenCalledWith('/api/cta/alerts?routeid=Red')
  })

  it('filters out bus-only alerts', async () => {
    const alerts = [
      makeAlert('1', [{ ServiceId: 'Red', ServiceName: 'Red Line' }]),
      makeAlert('2', [{ ServiceId: '22', ServiceName: 'Clark' }]),
    ]
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ CTAAlerts: { Alert: alerts } }),
    })

    const result = await fetchCTAAlerts()
    expect(result).toHaveLength(1)
    expect(result[0].AlertId).toBe('1')
  })

  it('handles single alert object (not array)', async () => {
    const alert = makeAlert('1', [{ ServiceId: 'Red', ServiceName: 'Red Line' }])
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ CTAAlerts: { Alert: alert } }),
    })

    const result = await fetchCTAAlerts()
    expect(result).toHaveLength(1)
  })

  it('returns empty array when no alerts', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ CTAAlerts: { Alert: null } }),
    })

    const result = await fetchCTAAlerts()
    expect(result).toHaveLength(0)
  })

  it('throws on HTTP error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    })

    await expect(fetchCTAAlerts()).rejects.toThrow('CTA API error: 500')
  })
})
