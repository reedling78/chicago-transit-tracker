import { normalizeMetraAlerts } from '../metra-alerts'
import type { GtfsFeedMessage } from '../metra-alerts'

function makeFeed(entities: GtfsFeedMessage['entity'] = []): GtfsFeedMessage {
  return { entity: entities }
}

function makeAlertEntity(
  id: string,
  routeIds: string[],
  header = 'Test Alert',
  description = 'Test description',
  url?: string,
) {
  return {
    id,
    alert: {
      informedEntity: routeIds.map((routeId) => ({ routeId })),
      headerText: { translation: [{ text: header }] },
      descriptionText: { translation: [{ text: description }] },
      url: url ? { translation: [{ text: url }] } : undefined,
    },
  }
}

describe('normalizeMetraAlerts', () => {
  it('normalizes a single alert entity', () => {
    const feed = makeFeed([makeAlertEntity('1', ['BNSF'], 'BNSF Delays', 'Expect delays')])
    const result = normalizeMetraAlerts(feed)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      id: '1',
      headline: 'BNSF Delays',
      description: 'Expect delays',
      url: null,
      routes: [
        {
          routeId: 'BNSF',
          routeName: 'BNSF Railway',
          color: '#1A3D7A',
          textColor: '#fff',
        },
      ],
      severity: null,
      isMajor: false,
      impact: null,
      startTime: null,
      endTime: null,
      service: 'metra',
    })
  })

  it('handles alerts with multiple informed entities', () => {
    const feed = makeFeed([makeAlertEntity('1', ['BNSF', 'RI'])])
    const result = normalizeMetraAlerts(feed)

    expect(result).toHaveLength(1)
    expect(result[0].routes).toHaveLength(2)
    expect(result[0].routes[0].routeId).toBe('BNSF')
    expect(result[0].routes[1].routeId).toBe('RI')
    expect(result[0].routes[1].routeName).toBe('Rock Island')
  })

  it('filters by routeId when provided', () => {
    const feed = makeFeed([
      makeAlertEntity('1', ['BNSF'], 'BNSF Alert'),
      makeAlertEntity('2', ['RI'], 'RI Alert'),
      makeAlertEntity('3', ['BNSF', 'RI'], 'Both lines'),
    ])

    const result = normalizeMetraAlerts(feed, 'RI')
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('2')
    expect(result[1].id).toBe('3')
  })

  it('skips entities without alert property', () => {
    const feed = makeFeed([{ id: '1' }])
    const result = normalizeMetraAlerts(feed)
    expect(result).toHaveLength(0)
  })

  it('skips alerts with no route IDs', () => {
    const feed = makeFeed([
      {
        id: '1',
        alert: {
          informedEntity: [{ agencyId: 'metra' }],
          headerText: { translation: [{ text: 'System-wide' }] },
        },
      },
    ])
    const result = normalizeMetraAlerts(feed)
    expect(result).toHaveLength(0)
  })

  it('returns empty array for empty feed', () => {
    expect(normalizeMetraAlerts(makeFeed())).toEqual([])
    expect(normalizeMetraAlerts(makeFeed([]))).toEqual([])
    expect(normalizeMetraAlerts({ entity: null })).toEqual([])
  })

  it('extracts URL when present', () => {
    const feed = makeFeed([
      makeAlertEntity('1', ['ME'], 'Alert', 'Desc', 'https://metrarail.com/alert/1'),
    ])
    const result = normalizeMetraAlerts(feed)
    expect(result[0].url).toBe('https://metrarail.com/alert/1')
  })

  it('handles missing translation text gracefully', () => {
    const feed = makeFeed([
      {
        id: '1',
        alert: {
          informedEntity: [{ routeId: 'BNSF' }],
          headerText: { translation: [] },
          descriptionText: null,
        },
      },
    ])
    const result = normalizeMetraAlerts(feed)
    expect(result[0].headline).toBe('')
    expect(result[0].description).toBe('')
  })

  it('uses fallback colors for unknown route IDs', () => {
    const feed = makeFeed([makeAlertEntity('1', ['UNKNOWN'])])
    const result = normalizeMetraAlerts(feed)
    expect(result[0].routes[0].color).toBe('#6b7280')
    expect(result[0].routes[0].routeName).toBe('UNKNOWN')
  })
})
