import { render } from '@testing-library/react'
import StationMap from '@components/StationMap'
import maplibregl from 'maplibre-gl'

jest.mock('maplibre-gl', () => ({
  Map: jest.fn().mockImplementation(() => ({
    remove: jest.fn(),
    setStyle: jest.fn(),
  })),
  Marker: jest.fn().mockImplementation(() => ({
    setLngLat: jest.fn().mockReturnThis(),
    setPopup: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
  })),
  Popup: jest.fn().mockImplementation(() => ({
    setHTML: jest.fn().mockReturnThis(),
  })),
}))

// MutationObserver is not available in jsdom — provide a minimal stub
global.MutationObserver = class {
  observe() {}
  disconnect() {}
  takeRecords() {
    return []
  }
} as unknown as typeof MutationObserver

describe('StationMap', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the map container div', () => {
    const { container } = render(
      <StationMap latitude={41.8857} longitude={-87.6318} name="Clark/Lake" />,
    )
    expect(container.querySelector('div')).toBeInTheDocument()
  })

  it('initializes maplibregl.Map with correct coordinates', () => {
    render(<StationMap latitude={41.8857} longitude={-87.6318} name="Clark/Lake" />)
    expect(maplibregl.Map).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [-87.6318, 41.8857],
        zoom: 14,
      }),
    )
  })

  it('creates a Marker at the station coordinates', () => {
    render(<StationMap latitude={41.8857} longitude={-87.6318} name="Clark/Lake" />)
    const markerInstance = (maplibregl.Marker as jest.Mock).mock.results[0].value
    expect(markerInstance.setLngLat).toHaveBeenCalledWith([-87.6318, 41.8857])
  })

  it('uses custom markerColor when provided', () => {
    render(
      <StationMap
        latitude={41.8857}
        longitude={-87.6318}
        name="Clark/Lake"
        markerColor="#00a1de"
      />,
    )
    expect(maplibregl.Marker).toHaveBeenCalledWith({ color: '#00a1de' })
  })

  it('uses default markerColor #C60C30 when not provided', () => {
    render(<StationMap latitude={41.8857} longitude={-87.6318} name="Clark/Lake" />)
    expect(maplibregl.Marker).toHaveBeenCalledWith({ color: '#C60C30' })
  })

  it('matches snapshot', () => {
    const { container } = render(
      <StationMap latitude={41.8857} longitude={-87.6318} name="Clark/Lake" />,
    )
    expect(container).toMatchSnapshot()
  })
})
