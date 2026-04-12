import { render, screen } from '@testing-library/react'
import { mockPaceRoute, mockPacePulseRoute } from '../fixtures'

jest.mock('@lib/pace', () => ({
  getAllPaceRoutes: jest.fn(),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getAllPaceRoutes } = require('@lib/pace')

describe('/pace/pulse page', () => {
  beforeEach(() => {
    ;(getAllPaceRoutes as jest.Mock).mockResolvedValue([mockPaceRoute, mockPacePulseRoute])
  })

  it('renders a Pulse-specific hero', async () => {
    const PulsePage = (await import('@/app/pace/pulse/page')).default
    render(await PulsePage())
    expect(
      screen.getByRole('heading', { level: 1, name: /Pulse/i }),
    ).toBeInTheDocument()
  })

  it('lists only Pulse routes', async () => {
    const PulsePage = (await import('@/app/pace/pulse/page')).default
    render(await PulsePage())
    expect(screen.getByText(/Milwaukee Avenue/i)).toBeInTheDocument()
    expect(screen.queryByText(/Golf Road/i)).not.toBeInTheDocument()
  })
})
