import { normalizeCtaAlerts } from '../cta-alerts'

function makeRawAlert(overrides: Record<string, unknown> = {}) {
  return {
    CTAAlerts: {
      Alert: {
        AlertId: '1',
        Headline: 'Red Line Delays',
        ShortDescription: 'Expect delays due to signal work',
        FullDescription: { '#cdata-section': 'Full description here' },
        SeverityScore: '25',
        SeverityColor: 'Yellow',
        SeverityCSS: 'planned',
        Impact: 'Planned Work',
        EventStart: '2026-04-01T00:00:00',
        EventEnd: null,
        TBD: '0',
        MajorAlert: '0',
        AlertURL: { '#cdata-section': 'https://transitchicago.com/alert/1' },
        ImpactedService: {
          Service: {
            ServiceType: 'R',
            ServiceTypeDescription: 'Rail',
            ServiceName: 'Red Line',
            ServiceId: 'Red',
            ServiceBackColor: 'c60c30',
            ServiceTextColor: 'ffffff',
            ServiceURL: { '#cdata-section': 'https://transitchicago.com/red' },
          },
        },
        ...overrides,
      },
    },
  }
}

describe('normalizeCtaAlerts', () => {
  it('normalizes a single rail alert', () => {
    const result = normalizeCtaAlerts(makeRawAlert())
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      id: '1',
      headline: 'Red Line Delays',
      description: 'Expect delays due to signal work',
      url: 'https://transitchicago.com/alert/1',
      routes: [
        {
          routeId: 'Red',
          routeName: 'Red Line',
          color: '#c60c30',
          textColor: '#ffffff',
        },
      ],
      severity: '25',
      impact: 'Planned Work',
      startTime: '2026-04-01T00:00:00',
      endTime: null,
      service: 'cta',
    })
  })

  it('handles Service as an array', () => {
    const result = normalizeCtaAlerts(
      makeRawAlert({
        ImpactedService: {
          Service: [
            {
              ServiceType: 'R',
              ServiceTypeDescription: 'Rail',
              ServiceName: 'Red Line',
              ServiceId: 'Red',
              ServiceBackColor: 'c60c30',
              ServiceTextColor: 'ffffff',
              ServiceURL: { '#cdata-section': '' },
            },
            {
              ServiceType: 'R',
              ServiceTypeDescription: 'Rail',
              ServiceName: 'Blue Line',
              ServiceId: 'Blue',
              ServiceBackColor: '00a1de',
              ServiceTextColor: 'ffffff',
              ServiceURL: { '#cdata-section': '' },
            },
          ],
        },
      }),
    )
    expect(result).toHaveLength(1)
    expect(result[0].routes).toHaveLength(2)
    expect(result[0].routes[0].routeId).toBe('Red')
    expect(result[0].routes[1].routeId).toBe('Blue')
  })

  it('filters out non-rail services (bus)', () => {
    const result = normalizeCtaAlerts(
      makeRawAlert({
        ImpactedService: {
          Service: {
            ServiceType: 'B',
            ServiceTypeDescription: 'Bus',
            ServiceName: 'Route 151',
            ServiceId: '151',
            ServiceBackColor: '565a5c',
            ServiceTextColor: 'ffffff',
            ServiceURL: { '#cdata-section': '' },
          },
        },
      }),
    )
    expect(result).toHaveLength(0)
  })

  it('filters by routeId when provided', () => {
    const raw = {
      CTAAlerts: {
        Alert: [
          makeRawAlert().CTAAlerts.Alert,
          {
            ...makeRawAlert().CTAAlerts.Alert,
            AlertId: '2',
            Headline: 'Blue Line Work',
            ImpactedService: {
              Service: {
                ServiceType: 'R',
                ServiceTypeDescription: 'Rail',
                ServiceName: 'Blue Line',
                ServiceId: 'Blue',
                ServiceBackColor: '00a1de',
                ServiceTextColor: 'ffffff',
                ServiceURL: { '#cdata-section': '' },
              },
            },
          },
        ],
      },
    }
    const result = normalizeCtaAlerts(raw, 'Blue')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('2')
  })

  it('returns empty array when no alerts exist', () => {
    expect(normalizeCtaAlerts({})).toEqual([])
    expect(normalizeCtaAlerts({ CTAAlerts: {} })).toEqual([])
    expect(normalizeCtaAlerts({ CTAAlerts: { Alert: [] } })).toEqual([])
  })

  it('handles missing AlertURL gracefully', () => {
    const result = normalizeCtaAlerts(
      makeRawAlert({ AlertURL: { '#cdata-section': '' } }),
    )
    expect(result[0].url).toBeNull()
  })

  it('prepends # to service colors', () => {
    const result = normalizeCtaAlerts(makeRawAlert())
    expect(result[0].routes[0].color).toBe('#c60c30')
    expect(result[0].routes[0].textColor).toBe('#ffffff')
  })
})
