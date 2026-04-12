import { render, screen } from '@testing-library/react'
import { mockPaceRoute, mockPacePulseRoute } from '../fixtures'

jest.mock('@lib/pace', () => ({
  getAllPaceRoutes: jest.fn(),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getAllPaceRoutes } = require('@lib/pace')

describe('/pace landing page', () => {
  beforeEach(() => {
    ;(getAllPaceRoutes as jest.Mock).mockResolvedValue([mockPaceRoute, mockPacePulseRoute])
  })

  it('renders the page title and description', async () => {
    const PacePage = (await import('@/app/pace/page')).default
    render(await PacePage())
    expect(screen.getByRole('heading', { name: /Pace Suburban Bus/i })).toBeInTheDocument()
  })

  it('renders the search input', async () => {
    const PacePage = (await import('@/app/pace/page')).default
    render(await PacePage())
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('renders the alerts disclaimer linking to pacebus.com', async () => {
    const PacePage = (await import('@/app/pace/page')).default
    render(await PacePage())
    const link = screen.getByRole('link', { name: /pacebus\.com/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('pacebus.com'))
  })

  it('renders Pulse and region sections', async () => {
    const PacePage = (await import('@/app/pace/page')).default
    render(await PacePage())
    expect(screen.getByRole('heading', { name: /Pulse/i })).toBeInTheDocument()
  })
})
