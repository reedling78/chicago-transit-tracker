import { render, screen } from '@testing-library/react'
import { mockPaceRoute, mockPacePulseRoute, mockPaceStop } from '../fixtures'

jest.mock('@lib/pace', () => ({
  getAllPaceRoutes: jest.fn(),
  getPaceRoute: jest.fn(),
  getPaceStop: jest.fn(),
  getAllPaceStops: jest.fn(),
}))

jest.mock('@components/PaceScheduleTable', () => {
  return function MockPaceScheduleTable() {
    return <div data-testid="pace-schedule-table-mock" />
  }
})

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getPaceRoute, getPaceStop } = require('@lib/pace')

describe('/pace/[route]/[stop] stop detail page', () => {
  beforeEach(() => {
    // Stop is served by '208' and 'milwaukee-pulse' per mockPaceStop.routes
    ;(getPaceRoute as jest.Mock).mockImplementation((slug: string) => {
      if (slug === '208') return Promise.resolve(mockPaceRoute)
      if (slug === 'milwaukee-pulse') return Promise.resolve(mockPacePulseRoute)
      return Promise.resolve(null)
    })
    ;(getPaceStop as jest.Mock).mockResolvedValue(mockPaceStop)
  })

  it('renders the stop name and route chip', async () => {
    const Page = (await import('@/app/pace/[route]/[stop]/page')).default
    render(await Page({ params: Promise.resolve({ route: '208', stop: 'golf-rd-waukegan-rd' }) }))
    expect(
      screen.getByRole('heading', { level: 1, name: /Golf Rd & Waukegan Rd/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('208')).toBeInTheDocument()
  })

  it('renders the served-route chips using resolved shortName, not raw slugs', async () => {
    const Page = (await import('@/app/pace/[route]/[stop]/page')).default
    render(await Page({ params: Promise.resolve({ route: '208', stop: 'golf-rd-waukegan-rd' }) }))

    // Displays the human-readable shortName, not the raw slug
    expect(screen.getByText('Milwaukee Pulse')).toBeInTheDocument()
    expect(screen.queryByText('milwaukee-pulse')).not.toBeInTheDocument()
    expect(screen.getByText('208')).toBeInTheDocument()
  })

  it('renders not found when route or stop is missing', async () => {
    ;(getPaceStop as jest.Mock).mockResolvedValue(null)
    const Page = (await import('@/app/pace/[route]/[stop]/page')).default
    render(await Page({ params: Promise.resolve({ route: '208', stop: 'nope' }) }))
    expect(screen.getByText(/not found/i)).toBeInTheDocument()
  })
})
