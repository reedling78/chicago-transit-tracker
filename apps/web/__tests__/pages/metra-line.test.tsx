import { render, screen } from '@testing-library/react'
import { mockMetraLine, mockMetraStation } from '../fixtures'

jest.mock('@lib/transit', () => ({
  getLinesForService: jest.fn().mockResolvedValue([mockMetraLine]),
  getLine: jest.fn().mockResolvedValue(mockMetraLine),
  getStationsForLine: jest.fn().mockResolvedValue([mockMetraStation]),
  getMetraLineTrips: jest.fn().mockResolvedValue([]),
}))

jest.mock('@components/MetraAlerts', () => {
  return function MockMetraAlerts() {
    return <div data-testid="metra-alerts-mock" />
  }
})

jest.mock('@components/MetraCurrentService', () => {
  return function MockMetraCurrentService(props: { lineSlug: string }) {
    return <div data-testid="metra-current-service-mock" data-line-slug={props.lineSlug} />
  }
})

import MetraLinePage from '@/app/metra/[line]/page'

describe('Metra line detail page', () => {
  const params = Promise.resolve({ line: 'bnsf' })

  it('renders the line name heading', async () => {
    const ui = await MetraLinePage({ params })
    render(ui)
    expect(screen.getByRole('heading', { level: 1, name: 'BNSF Railway' })).toBeInTheDocument()
  })

  it('renders the breadcrumb with Metra Lines link', async () => {
    const ui = await MetraLinePage({ params })
    render(ui)
    expect(screen.getByRole('link', { name: 'Metra Lines' })).toBeInTheDocument()
  })

  it('renders the station in the list', async () => {
    const ui = await MetraLinePage({ params })
    render(ui)
    expect(screen.getAllByText('Aurora').length).toBeGreaterThanOrEqual(1)
  })

  it('renders "Line not found" when getLine returns null', async () => {
    const { getLine } = await import('@lib/transit')
    ;(getLine as jest.Mock).mockResolvedValueOnce(null)

    const ui = await MetraLinePage({ params })
    render(ui)
    expect(screen.getByText('Line not found.')).toBeInTheDocument()
  })

  it('uses the Metra hero background image', async () => {
    const ui = await MetraLinePage({ params })
    const { container } = render(ui)
    const img = container.querySelector('img')
    expect(img?.getAttribute('src')).toContain('hero-header-metra.jpg')
  })

  it('renders the CurrentService component with the line slug', async () => {
    const ui = await MetraLinePage({ params })
    render(ui)
    const mock = screen.getByTestId('metra-current-service-mock')
    expect(mock).toBeInTheDocument()
    expect(mock.getAttribute('data-line-slug')).toBe('bnsf')
  })

  it('fetches Metra line trips server-side', async () => {
    const { getMetraLineTrips } = await import('@lib/transit')
    ;(getMetraLineTrips as jest.Mock).mockClear()
    const ui = await MetraLinePage({ params })
    render(ui)
    expect(getMetraLineTrips).toHaveBeenCalledWith('bnsf')
  })

  it('matches snapshot', async () => {
    const ui = await MetraLinePage({ params })
    const { container } = render(ui)
    expect(container).toMatchSnapshot()
  })
})
