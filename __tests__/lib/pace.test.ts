/**
 * @jest-environment node
 */

jest.mock('@lib/firebase-admin', () => {
  const mockGet = jest.fn()
  const mockWhere = jest.fn().mockReturnValue({ get: mockGet })
  const mockDoc = jest.fn().mockReturnValue({ get: mockGet })
  const mockCollection = jest.fn().mockReturnValue({
    get: mockGet,
    where: mockWhere,
    doc: mockDoc,
  })
  return {
    getFirestore: jest.fn().mockReturnValue({ collection: mockCollection }),
    db: { collection: mockCollection },
    __mocks: { mockGet, mockWhere, mockDoc, mockCollection },
  }
})

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __mocks } = require('@lib/firebase-admin')
const { mockGet, mockCollection } = __mocks

beforeEach(() => {
  jest.clearAllMocks()
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
