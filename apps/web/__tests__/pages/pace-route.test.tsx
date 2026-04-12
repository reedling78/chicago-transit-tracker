import { render, screen } from '@testing-library/react'
import { mockPaceRoute, mockPacePulseRoute } from '../fixtures'

jest.mock('@lib/pace', () => ({
  getAllPaceRoutes: jest.fn(),
  getPaceRoute: jest.fn(),
  getPaceRouteStops: jest.fn(),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getPaceRoute, getPaceRouteStops, getAllPaceRoutes } = require('@lib/pace')

describe('/pace/[route] route detail page', () => {
  beforeEach(() => {
    ;(getAllPaceRoutes as jest.Mock).mockResolvedValue([mockPaceRoute])
    ;(getPaceRoute as jest.Mock).mockResolvedValue(mockPaceRoute)
    ;(getPaceRouteStops as jest.Mock).mockResolvedValue([
      { slug: 'a', name: 'Stop A', lat: 0, lon: 0, sequence: 1 },
      { slug: 'b', name: 'Stop B', lat: 0, lon: 0, sequence: 2 },
    ])
  })

  it('renders the route name and description', async () => {
    const Page = (await import('@/app/pace/[route]/page')).default
    render(await Page({ params: Promise.resolve({ route: '208' }) }))
    expect(screen.getByText(/Golf Road/i)).toBeInTheDocument()
  })

  it('lists the stop sequence', async () => {
    const Page = (await import('@/app/pace/[route]/page')).default
    render(await Page({ params: Promise.resolve({ route: '208' }) }))
    expect(screen.getByText('Stop A')).toBeInTheDocument()
    expect(screen.getByText('Stop B')).toBeInTheDocument()
  })

  it('capitalizes the serviceType badge (e.g. "Local" not "local")', async () => {
    const Page = (await import('@/app/pace/[route]/page')).default
    render(await Page({ params: Promise.resolve({ route: '208' }) }))
    expect(screen.getByText('Local')).toBeInTheDocument()
    expect(screen.queryByText('local')).not.toBeInTheDocument()
  })

  it('renders "Pulse BRT" for pulse serviceType', async () => {
    ;(getPaceRoute as jest.Mock).mockResolvedValue(mockPacePulseRoute)
    const Page = (await import('@/app/pace/[route]/page')).default
    render(await Page({ params: Promise.resolve({ route: 'milwaukee-pulse' }) }))
    expect(screen.getByText('Pulse BRT')).toBeInTheDocument()
  })

  it('renders a not-found message for unknown routes', async () => {
    ;(getPaceRoute as jest.Mock).mockResolvedValue(null)
    const Page = (await import('@/app/pace/[route]/page')).default
    render(await Page({ params: Promise.resolve({ route: 'nope' }) }))
    expect(screen.getByText(/not found/i)).toBeInTheDocument()
  })
})
