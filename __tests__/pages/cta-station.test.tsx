import { render, screen } from '@testing-library/react'
import { mockLine, mockStation } from '../fixtures'

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

global.MutationObserver = class {
  observe() {}
  disconnect() {}
  takeRecords() {
    return []
  }
} as unknown as typeof MutationObserver

jest.mock('@lib/transit', () => ({
  getLinesForService: jest.fn().mockResolvedValue([mockLine]),
  getLine: jest.fn().mockResolvedValue(mockLine),
  getStationsForLine: jest.fn().mockResolvedValue([mockStation]),
  getStation: jest.fn().mockResolvedValue(mockStation),
  getAllLines: jest.fn().mockResolvedValue([mockLine]),
}))

import CTAStationPage from '@/app/cta/[line]/[station]/page'

describe('CTA station detail page', () => {
  const params = Promise.resolve({ line: 'red', station: 'clark-lake' })

  it('renders the station name heading', async () => {
    const ui = await CTAStationPage({ params })
    render(ui)
    expect(screen.getByRole('heading', { level: 1, name: 'Clark/Lake' })).toBeInTheDocument()
  })

  it('renders breadcrumb with CTA Lines link', async () => {
    const ui = await CTAStationPage({ params })
    render(ui)
    expect(screen.getByRole('link', { name: 'CTA Lines' })).toBeInTheDocument()
  })

  it('renders the station address', async () => {
    const ui = await CTAStationPage({ params })
    render(ui)
    expect(screen.getByText('100 W Lake St, Chicago, IL')).toBeInTheDocument()
  })

  it('renders "Station not found" when getStation returns null', async () => {
    const { getStation } = await import('@lib/transit')
    ;(getStation as jest.Mock).mockResolvedValueOnce(null)

    const ui = await CTAStationPage({ params })
    render(ui)
    expect(screen.getByText('Station not found.')).toBeInTheDocument()
  })

  it('uses single-column layout on mobile and two-column on desktop', async () => {
    const ui = await CTAStationPage({ params })
    const { container } = render(ui)
    const layoutDiv = container.querySelector('.flex.flex-col.lg\\:flex-row')
    expect(layoutDiv).toBeInTheDocument()
  })

  it('matches snapshot', async () => {
    const ui = await CTAStationPage({ params })
    const { container } = render(ui)
    expect(container).toMatchSnapshot()
  })
})
