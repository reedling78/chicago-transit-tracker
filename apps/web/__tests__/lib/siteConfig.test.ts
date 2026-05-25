import { siteConfig } from '@lib/siteConfig'

describe('siteConfig', () => {
  it('has required fields', () => {
    expect(siteConfig.name).toBe('Chicago Transit Tracker')
    expect(siteConfig.url).toBe('https://chicagotransittracker.com')
    expect(siteConfig.description).toBeTruthy()
  })

  it('does not expose a standalone GA tag id (analytics goes through Firebase)', () => {
    expect((siteConfig as Record<string, unknown>).gaId).toBeUndefined()
  })

  it('ogImage includes url, width, height, and type', () => {
    expect(siteConfig.ogImage).toEqual({
      url: '/og-default.jpg',
      width: 1200,
      height: 630,
      type: 'image/jpeg',
    })
  })
})
