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
const { mockGet } = __mocks

describe('GET /api/schedules/[slug]', () => {
  it('returns schedule data for a valid slug', async () => {
    const scheduleData = {
      service: 'cta',
      directions: [{ headsign: "O'Hare", line: 'Blue', weekday: [510], saturday: [], sunday: [] }],
    }
    mockGet.mockResolvedValue({ exists: true, data: () => scheduleData })

    const { GET } = await import('@/app/api/schedules/[slug]/route')
    const req = new Request('http://localhost/api/schedules/clark-lake')
    const res = await GET(req as never, { params: Promise.resolve({ slug: 'clark-lake' }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.service).toBe('cta')
    expect(body.directions).toHaveLength(1)
  })

  it('normalizes direction headsigns to display names', async () => {
    const stored = {
      service: 'metra',
      directions: [
        { headsign: 'Chicago OTC', line: 'UP-W', weekday: [294], saturday: [], sunday: [] },
      ],
    }
    mockGet.mockResolvedValue({ exists: true, data: () => stored })

    const { GET } = await import('@/app/api/schedules/[slug]/route')
    const req = new Request('http://localhost/api/schedules/lombard')
    const res = await GET(req as never, { params: Promise.resolve({ slug: 'lombard' }) })

    const body = await res.json()
    expect(body.directions[0].headsign).toBe('Ogilvie TC')
    expect(stored.directions[0].headsign).toBe('Chicago OTC')
  })

  it('returns 404 for a missing slug', async () => {
    mockGet.mockResolvedValue({ exists: false })

    const { GET } = await import('@/app/api/schedules/[slug]/route')
    const req = new Request('http://localhost/api/schedules/nonexistent')
    const res = await GET(req as never, { params: Promise.resolve({ slug: 'nonexistent' }) })

    expect(res.status).toBe(404)
  })
})
