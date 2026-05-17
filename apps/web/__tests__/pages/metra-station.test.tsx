import { render, screen } from '@testing-library/react'
import { mockMetraLine, mockMetraStation } from '../fixtures'

// Mock maplibre-gl — StationMap uses it and requires canvas/WebGL
jest.mock('maplibre-gl', () => ({
  Map: jest.fn().mockImplementation(() => ({ remove: jest.fn(), setStyle: jest.fn() })),
  Marker: jest.fn().mockImplementation(() => ({
    setLngLat: jest.fn().mockReturnThis(),
    setPopup: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
  })),
  Popup: jest.fn().mockImplementation(() => ({ setHTML: jest.fn().mockReturnThis() })),
}))

// Mock client components that fire async fetches — keeps page tests synchronous
jest.mock('@components/Arrivals', () => () => null)
jest.mock('@components/StationTimetable', () => () => null)

global.MutationObserver = class {
  observe() {}
  disconnect() {}
  takeRecords() {
    return []
  }
} as unknown as typeof MutationObserver

jest.mock('@lib/transit', () => ({
  getLinesForService: jest.fn().mockResolvedValue([mockMetraLine]),
  getLine: jest.fn().mockResolvedValue(mockMetraLine),
  getStationsForLine: jest.fn().mockResolvedValue([mockMetraStation]),
  getStation: jest.fn().mockResolvedValue(mockMetraStation),
  getAllLines: jest.fn().mockResolvedValue([mockMetraLine]),
}))

import MetraStationPage, { generateMetadata } from '@/app/metra/[line]/[station]/page'
import { siteConfig } from '@lib/siteConfig'

describe('Metra station detail page', () => {
  const params = Promise.resolve({ line: 'bnsf', station: 'aurora' })

  it('renders the station name heading', async () => {
    const ui = await MetraStationPage({ params })
    render(ui)
    expect(screen.getByRole('heading', { level: 1, name: 'Aurora' })).toBeInTheDocument()
  })

  it('renders breadcrumb with Metra Lines link', async () => {
    const ui = await MetraStationPage({ params })
    render(ui)
    expect(screen.getByRole('link', { name: 'Metra Lines' })).toBeInTheDocument()
  })

  it('shows the full proper name in the H1 but the short display name in the breadcrumb', async () => {
    const { getStation } = await import('@lib/transit')
    ;(getStation as jest.Mock).mockResolvedValueOnce({
      ...mockMetraStation,
      name: 'Chicago Union Station',
    })

    const ui = await MetraStationPage({ params })
    render(ui)

    // H1 keeps the full canonical name
    expect(
      screen.getByRole('heading', { level: 1, name: 'Chicago Union Station' }),
    ).toBeInTheDocument()
    // breadcrumb leaf (current page, no link) uses the short display name
    const crumb = screen.getByText('Union Station')
    expect(crumb).toHaveAttribute('aria-current', 'page')
  })

  it('renders the Terminal badge', async () => {
    const ui = await MetraStationPage({ params })
    render(ui)
    expect(screen.getAllByText('Terminal').length).toBeGreaterThanOrEqual(1)
  })

  it('renders "Station not found" when getStation returns null', async () => {
    const { getStation } = await import('@lib/transit')
    ;(getStation as jest.Mock).mockResolvedValueOnce(null)

    const ui = await MetraStationPage({ params })
    render(ui)
    expect(screen.getByText('Station not found.')).toBeInTheDocument()
  })

  it('uses single-column layout on mobile and two-column on desktop', async () => {
    const ui = await MetraStationPage({ params })
    const { container } = render(ui)
    const layoutDiv = container.querySelector('.flex.flex-col.lg\\:flex-row')
    expect(layoutDiv).toBeInTheDocument()
  })

  it('uses the Metra hero background image', async () => {
    const ui = await MetraStationPage({ params })
    const { container } = render(ui)
    const imgs = container.querySelectorAll('img')
    const hero = Array.from(imgs).find((i) => (i.getAttribute('src') || '').includes('hero-header'))
    expect(hero?.getAttribute('src')).toContain('hero-header-metra.jpg')
  })

  it('uses station.photoUrl as the hero image when set', async () => {
    const { getStation } = await import('@lib/transit')
    ;(getStation as jest.Mock).mockResolvedValueOnce({
      ...mockMetraStation,
      photoUrl: 'https://storage.googleapis.com/bucket/stations/aurora/hero.jpg',
    })

    const ui = await MetraStationPage({ params })
    const { container } = render(ui)
    const imgs = container.querySelectorAll('img')
    const hero = Array.from(imgs).find((i) => {
      const src = i.getAttribute('src') || ''
      return src.includes('aurora') || src.includes('aurora%2Fhero')
    })
    expect(hero).toBeTruthy()
  })

  it('matches snapshot', async () => {
    const ui = await MetraStationPage({ params })
    const { container } = render(ui)
    expect(container).toMatchSnapshot()
  })

  describe('generateMetadata OG image fallback', () => {
    it('uses photoUrls.og when set', async () => {
      const { getStation } = await import('@lib/transit')
      ;(getStation as jest.Mock).mockResolvedValueOnce({
        ...mockMetraStation,
        photoUrl: 'https://example.com/desktop.jpg',
        photoUrls: {
          desktop: 'https://example.com/desktop.jpg',
          mobile: 'https://example.com/mobile.jpg',
          og: 'https://example.com/og.jpg',
        },
      })

      const meta = await generateMetadata({ params })
      expect(meta.openGraph?.images).toEqual(['https://example.com/og.jpg'])
      expect(meta.twitter?.images).toEqual(['https://example.com/og.jpg'])
    })

    it('falls back to photoUrl when photoUrls is null', async () => {
      const { getStation } = await import('@lib/transit')
      ;(getStation as jest.Mock).mockResolvedValueOnce({
        ...mockMetraStation,
        photoUrl: 'https://example.com/legacy-hero.jpg',
        photoUrls: null,
      })

      const meta = await generateMetadata({ params })
      expect(meta.openGraph?.images).toEqual(['https://example.com/legacy-hero.jpg'])
      expect(meta.twitter?.images).toEqual(['https://example.com/legacy-hero.jpg'])
    })

    it('falls back to siteConfig.ogImage when neither is set', async () => {
      const { getStation } = await import('@lib/transit')
      ;(getStation as jest.Mock).mockResolvedValueOnce({
        ...mockMetraStation,
        photoUrl: null,
        photoUrls: null,
      })

      const meta = await generateMetadata({ params })
      expect(meta.openGraph?.images).toEqual([siteConfig.ogImage])
      expect(meta.twitter?.images).toEqual([siteConfig.ogImage])
    })
  })
})
