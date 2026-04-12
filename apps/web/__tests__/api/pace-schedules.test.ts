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

describe('GET /api/pace/schedules/[slug]', () => {
  it('returns schedule data for a valid stop slug', async () => {
    const data = {
      routes: {
        '208': {
          directions: {
            '0': { weekday: [400, 415], saturday: [], sunday: [] },
          },
        },
      },
    }
    mockGet.mockResolvedValue({ exists: true, data: () => data })

    const { GET } = await import('@/app/api/pace/schedules/[slug]/route')
    const req = new Request('http://localhost/api/pace/schedules/golf-rd-waukegan-rd')
    const res = await GET(req as never, {
      params: Promise.resolve({ slug: 'golf-rd-waukegan-rd' }),
    })

    expect(mockCollection).toHaveBeenCalledWith('pace-schedules')
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=3600')
    const body = await res.json()
    expect(body.routes['208']).toBeDefined()
  })

  it('returns 404 for a missing slug', async () => {
    mockGet.mockResolvedValue({ exists: false })
    const { GET } = await import('@/app/api/pace/schedules/[slug]/route')
    const req = new Request('http://localhost/api/pace/schedules/nope')
    const res = await GET(req as never, { params: Promise.resolve({ slug: 'nope' }) })
    expect(res.status).toBe(404)
  })
})
