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

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /api/metra/station-trips/[slug]', () => {
  it('returns station trips data', async () => {
    const data = { weekday: [{ tripId: 't1', departure: '6:45 AM' }], saturday: [], sunday: [] }
    mockGet.mockResolvedValue({ exists: true, data: () => data })

    const { GET } = await import('@/app/api/metra/station-trips/[slug]/route')
    const req = new Request('http://localhost/api/metra/station-trips/route-59')
    const res = await GET(req as never, { params: Promise.resolve({ slug: 'route-59' }) })

    expect(res.status).toBe(200)
    expect(mockCollection).toHaveBeenCalledWith('metra-station-trips')
    const body = await res.json()
    expect(body.weekday).toHaveLength(1)
  })

  it('returns 404 when station not found', async () => {
    mockGet.mockResolvedValue({ exists: false })

    const { GET } = await import('@/app/api/metra/station-trips/[slug]/route')
    const req = new Request('http://localhost/api/metra/station-trips/missing')
    const res = await GET(req as never, { params: Promise.resolve({ slug: 'missing' }) })

    expect(res.status).toBe(404)
  })
})

describe('GET /api/metra/trip-index/[line]', () => {
  it('returns trip index for a line', async () => {
    const data = { weekday: [{ tripId: 't1' }], saturday: [], sunday: [] }
    mockGet.mockResolvedValue({ exists: true, data: () => data })

    const { GET } = await import('@/app/api/metra/trip-index/[line]/route')
    const req = new Request('http://localhost/api/metra/trip-index/bnsf')
    const res = await GET(req as never, { params: Promise.resolve({ line: 'bnsf' }) })

    expect(res.status).toBe(200)
    expect(mockCollection).toHaveBeenCalledWith('metra-trip-indexes')
  })
})

describe('GET /api/metra/trips/[tripId]', () => {
  it('returns trip detail', async () => {
    const data = { tripId: 'bnsf_bn1234', trainNumber: '1234', stops: [] }
    mockGet.mockResolvedValue({ exists: true, data: () => data })

    const { GET } = await import('@/app/api/metra/trips/[tripId]/route')
    const req = new Request('http://localhost/api/metra/trips/bnsf_bn1234')
    const res = await GET(req as never, { params: Promise.resolve({ tripId: 'bnsf_bn1234' }) })

    expect(res.status).toBe(200)
    expect(mockCollection).toHaveBeenCalledWith('metra-trips')
  })
})
