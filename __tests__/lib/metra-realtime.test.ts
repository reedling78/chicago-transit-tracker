import { fetchMetraFeed } from '@lib/metra-realtime'
import { transit_realtime } from 'gtfs-realtime-bindings'

// Mock gtfs-realtime-bindings
jest.mock('gtfs-realtime-bindings', () => ({
  transit_realtime: {
    FeedMessage: {
      decode: jest.fn(),
    },
  },
}))

const mockDecode = transit_realtime.FeedMessage.decode as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
})

describe('fetchMetraFeed', () => {
  it('fetches and decodes alerts feed', async () => {
    const mockFeed = { header: {}, entity: [{ id: '1' }] }
    mockDecode.mockReturnValue(mockFeed)
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    })

    const result = await fetchMetraFeed('alerts')

    expect(global.fetch).toHaveBeenCalledWith('/api/metra/alerts')
    expect(mockDecode).toHaveBeenCalled()
    expect(result).toBe(mockFeed)
  })

  it('fetches positions feed with correct URL', async () => {
    mockDecode.mockReturnValue({ header: {}, entity: [] })
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    })

    await fetchMetraFeed('positions')

    expect(global.fetch).toHaveBeenCalledWith('/api/metra/positions')
  })

  it('fetches tripupdates feed with correct URL', async () => {
    mockDecode.mockReturnValue({ header: {}, entity: [] })
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    })

    await fetchMetraFeed('tripupdates')

    expect(global.fetch).toHaveBeenCalledWith('/api/metra/tripupdates')
  })

  it('throws on HTTP error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
    })

    await expect(fetchMetraFeed('alerts')).rejects.toThrow('Metra API error: 401')
  })
})
