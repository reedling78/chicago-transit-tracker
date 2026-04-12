/**
 * @jest-environment node
 */

jest.mock('@lib/transit', () => ({
  getLinesForService: jest.fn(),
  getStationsForLine: jest.fn(),
}))

jest.mock('@lib/pace', () => ({
  getAllPaceRoutes: jest.fn(),
  getAllPaceStops: jest.fn(),
}))

jest.mock('@lib/firebase-admin', () => ({
  getFirestore: jest.fn(),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getLinesForService, getStationsForLine } = require('@lib/transit')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getAllPaceRoutes, getAllPaceStops } = require('@lib/pace')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getFirestore } = require('@lib/firebase-admin')

describe('sitemap()', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getLinesForService as jest.Mock).mockResolvedValue([])
    ;(getStationsForLine as jest.Mock).mockResolvedValue([])
    ;(getAllPaceRoutes as jest.Mock).mockResolvedValue([
      {
        slug: '208',
        shortName: '208',
        longName: 'Golf Road',
        serviceType: 'local',
        region: 'north',
        color: '#005DAA',
        textColor: '#FFFFFF',
        description: null,
        directions: [],
      },
    ])
    ;(getAllPaceStops as jest.Mock).mockResolvedValue([
      {
        slug: 'golf-rd-waukegan-rd',
        name: 'Golf Rd & Waukegan Rd',
        lat: 0,
        lon: 0,
        routes: ['208'],
        wheelchairBoarding: true,
      },
      {
        slug: 'unrelated',
        name: 'Unrelated',
        lat: 0,
        lon: 0,
        routes: ['999'],
        wheelchairBoarding: false,
      },
    ])
    ;(getFirestore as jest.Mock).mockReturnValue({
      collection: () => ({ doc: () => ({ get: async () => ({ exists: false }) }) }),
    })
  })

  it('includes the /pace and /pace/pulse landing URLs', async () => {
    const sitemap = (await import('@/app/sitemap')).default
    const entries = await sitemap()
    const urls = entries.map((e) => e.url)
    expect(urls).toContain('https://chicagotransittracker.com/pace')
    expect(urls).toContain('https://chicagotransittracker.com/pace/pulse')
  })

  it('includes an entry for each Pace route', async () => {
    const sitemap = (await import('@/app/sitemap')).default
    const entries = await sitemap()
    const urls = entries.map((e) => e.url)
    expect(urls).toContain('https://chicagotransittracker.com/pace/208')
  })

  it('includes only (route, stop) pairs where the stop serves the route', async () => {
    const sitemap = (await import('@/app/sitemap')).default
    const entries = await sitemap()
    const urls = entries.map((e) => e.url)
    expect(urls).toContain('https://chicagotransittracker.com/pace/208/golf-rd-waukegan-rd')
    expect(urls).not.toContain('https://chicagotransittracker.com/pace/208/unrelated')
  })
})
