/**
 * @jest-environment node
 */

const mockGet = jest.fn()
const mockWhere = jest.fn()
const mockDoc = jest.fn()
const mockCollection = jest.fn()

jest.mock('@lib/firebase-admin', () => ({
  getFirestore: jest.fn().mockReturnValue({ collection: mockCollection }),
  db: { collection: mockCollection },
}))

beforeEach(() => {
  jest.resetModules()
  jest.clearAllMocks()
  mockDoc.mockReturnValue({ get: mockGet })
  mockWhere.mockReturnValue({ get: mockGet })
  mockCollection.mockReturnValue({ get: mockGet, where: mockWhere, doc: mockDoc })
})

describe('getAllPaceRoutes', () => {
  it('reads all documents from the pace-routes collection', async () => {
    mockGet.mockResolvedValue({
      docs: [
        {
          id: '208',
          data: () => ({
            slug: '208',
            shortName: '208',
            longName: 'Golf Road',
            serviceType: 'local',
            region: 'north',
            color: '#005DAA',
            textColor: '#FFFFFF',
            description: null,
            directions: [{ id: '0', name: 'East' }],
          }),
        },
      ],
    })

    const { getAllPaceRoutes } = await import('@lib/pace')
    const routes = await getAllPaceRoutes()

    expect(mockCollection).toHaveBeenCalledWith('pace-routes')
    expect(routes).toHaveLength(1)
    expect(routes[0].slug).toBe('208')
    expect(routes[0].shortName).toBe('208')
    expect(routes[0].longName).toBe('Golf Road')
    expect(routes[0].region).toBe('north')
  })

  it('applies defaults for missing optional fields', async () => {
    mockGet.mockResolvedValue({
      docs: [
        {
          id: 'minimal',
          data: () => ({ shortName: 'X', longName: 'Minimal Route' }),
        },
      ],
    })

    const { getAllPaceRoutes } = await import('@lib/pace')
    const routes = await getAllPaceRoutes()
    expect(routes).toHaveLength(1)
    expect(routes[0].slug).toBe('minimal')
    expect(routes[0].color).toBe('#005DAA')
    expect(routes[0].textColor).toBe('#FFFFFF')
    expect(routes[0].serviceType).toBe('local')
    expect(routes[0].region).toBe('north')
    expect(routes[0].directions).toEqual([])
    expect(routes[0].description).toBeNull()
  })
})

describe('getPaceRoute', () => {
  it('returns the route for a valid slug', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      id: '208',
      data: () => ({
        slug: '208',
        shortName: '208',
        longName: 'Golf Road',
        serviceType: 'local',
        region: 'north',
        color: '#005DAA',
        textColor: '#FFFFFF',
        description: null,
        directions: [],
      }),
    })

    const { getPaceRoute } = await import('@lib/pace')
    const route = await getPaceRoute('208')

    expect(mockCollection).toHaveBeenCalledWith('pace-routes')
    expect(route).not.toBeNull()
    expect(route?.slug).toBe('208')
  })

  it('returns null for a missing slug', async () => {
    mockGet.mockResolvedValue({ exists: false })

    const { getPaceRoute } = await import('@lib/pace')
    const route = await getPaceRoute('nonexistent')

    expect(route).toBeNull()
  })
})

describe('getAllPaceStops', () => {
  it('reads all documents from the pace-stops collection', async () => {
    mockGet.mockResolvedValue({
      docs: [
        {
          id: 'golf-rd-waukegan-rd',
          data: () => ({
            slug: 'golf-rd-waukegan-rd',
            name: 'Golf Rd & Waukegan Rd',
            lat: 42.0586,
            lon: -87.7972,
            routes: ['208'],
            wheelchairBoarding: true,
          }),
        },
      ],
    })

    const { getAllPaceStops } = await import('@lib/pace')
    const stops = await getAllPaceStops()

    expect(mockCollection).toHaveBeenCalledWith('pace-stops')
    expect(stops).toHaveLength(1)
    expect(stops[0].name).toBe('Golf Rd & Waukegan Rd')
  })
})

describe('getPaceStop', () => {
  it('returns the stop for a valid slug', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      id: 'golf-rd-waukegan-rd',
      data: () => ({
        slug: 'golf-rd-waukegan-rd',
        name: 'Golf Rd & Waukegan Rd',
        lat: 42.0586,
        lon: -87.7972,
        routes: ['208'],
        wheelchairBoarding: true,
      }),
    })

    const { getPaceStop } = await import('@lib/pace')
    const stop = await getPaceStop('golf-rd-waukegan-rd')
    expect(stop?.name).toBe('Golf Rd & Waukegan Rd')
  })

  it('returns null for a missing slug', async () => {
    mockGet.mockResolvedValue({ exists: false })
    const { getPaceStop } = await import('@lib/pace')
    expect(await getPaceStop('nope')).toBeNull()
  })
})

describe('getPaceRouteStops', () => {
  it('returns the direction-specific stop sequence for a route', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        directions: {
          '0': [
            { slug: 'stop-a', name: 'Stop A', lat: 0, lon: 0, sequence: 1 },
            { slug: 'stop-b', name: 'Stop B', lat: 0, lon: 0, sequence: 2 },
          ],
          '1': [
            { slug: 'stop-b', name: 'Stop B', lat: 0, lon: 0, sequence: 1 },
            { slug: 'stop-a', name: 'Stop A', lat: 0, lon: 0, sequence: 2 },
          ],
        },
      }),
    })

    const { getPaceRouteStops } = await import('@lib/pace')
    const stops = await getPaceRouteStops('208', '0')

    expect(mockCollection).toHaveBeenCalledWith('pace-route-stops')
    expect(stops).toHaveLength(2)
    expect(stops[0].slug).toBe('stop-a')
    expect(stops[1].slug).toBe('stop-b')
  })

  it('returns empty array when route has no stops for the direction', async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({ directions: {} }) })
    const { getPaceRouteStops } = await import('@lib/pace')
    expect(await getPaceRouteStops('208', '0')).toEqual([])
  })

  it('returns empty array when route document does not exist', async () => {
    mockGet.mockResolvedValue({ exists: false })
    const { getPaceRouteStops } = await import('@lib/pace')
    expect(await getPaceRouteStops('404', '0')).toEqual([])
  })
})
