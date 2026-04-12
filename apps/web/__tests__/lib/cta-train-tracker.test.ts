import { fetchCtaTrainLocations } from '@lib/cta-train-tracker'

beforeEach(() => {
  global.fetch = jest.fn()
})

describe('fetchCtaTrainLocations', () => {
  it('hits the proxy with the correct route', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ctatt: { route: [] } }),
    })
    await fetchCtaTrainLocations('red')
    expect(global.fetch).toHaveBeenCalledWith('/api/cta/train-locations?rt=red')
  })

  it('returns the parsed response', async () => {
    const body = { ctatt: { route: [{ '@name': 'red', train: [] }] } }
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => body })
    const result = await fetchCtaTrainLocations('red')
    expect(result).toEqual(body)
  })

  it('throws on HTTP error', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 502 })
    await expect(fetchCtaTrainLocations('red')).rejects.toThrow('CTA API error: 502')
  })

  it('normalizes a single-train response to an array', async () => {
    const body = {
      ctatt: {
        route: [
          {
            '@name': 'y',
            train: {
              rn: '1',
              destSt: '40900',
              destNm: 'Dempster-Skokie',
              trDr: '5',
              nextStaId: '40900',
              nextStaNm: 'Dempster-Skokie',
              prdt: '2026-04-11T08:00:00',
              arrT: '2026-04-11T08:05:00',
              isApp: '0',
              isDly: '0',
              lat: '42.04',
              lon: '-87.75',
              heading: '0',
            },
          },
        ],
      },
    }
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => body })
    const result = await fetchCtaTrainLocations('y')
    expect(Array.isArray(result.ctatt.route[0].train)).toBe(true)
    expect(result.ctatt.route[0].train).toHaveLength(1)
  })
})
