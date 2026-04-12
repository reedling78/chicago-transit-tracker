/**
 * @jest-environment node
 */

jest.mock('@lib/firebase-admin', () => {
  const mockGet = jest.fn()
  const mockDoc = jest.fn().mockReturnValue({ get: mockGet })
  const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc })
  return {
    db: { collection: mockCollection },
    getFirestore: jest.fn(),
    __mocks: { mockGet, mockDoc, mockCollection },
  }
})

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __mocks } = require('@lib/firebase-admin')
const { mockGet, mockCollection } = __mocks

beforeEach(() => jest.clearAllMocks())

describe('GET /api/pace/route-stops/[route]', () => {
  it('returns stop sequences for a valid route', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        directions: {
          '0': [{ slug: 'a', name: 'A', lat: 0, lon: 0, sequence: 1 }],
          '1': [{ slug: 'a', name: 'A', lat: 0, lon: 0, sequence: 1 }],
        },
      }),
    })

    const { GET } = await import('@/app/api/pace/route-stops/[route]/route')
    const req = new Request('http://localhost/api/pace/route-stops/208')
    const res = await GET(req as never, { params: Promise.resolve({ route: '208' }) })

    expect(mockCollection).toHaveBeenCalledWith('pace-route-stops')
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=3600')
    const body = await res.json()
    expect(body.directions['0']).toHaveLength(1)
  })

  it('returns 404 for a missing route', async () => {
    mockGet.mockResolvedValue({ exists: false })
    const { GET } = await import('@/app/api/pace/route-stops/[route]/route')
    const req = new Request('http://localhost/api/pace/route-stops/nope')
    const res = await GET(req as never, { params: Promise.resolve({ route: 'nope' }) })
    expect(res.status).toBe(404)
  })
})
