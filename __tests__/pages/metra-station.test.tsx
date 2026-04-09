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
}))

import MetraStationPage from '@/app/metra/[line]/[station]/page'

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

  it('matches snapshot', async () => {
    const ui = await MetraStationPage({ params })
    const { container } = render(ui)
    expect(container).toMatchSnapshot()
  })
})
