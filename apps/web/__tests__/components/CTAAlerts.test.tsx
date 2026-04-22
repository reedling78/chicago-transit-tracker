import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import CTAAlerts from '@components/CTAAlerts'
import { fetchCTAAlerts } from '@lib/cta-alerts'
import type { NormalizedAlert } from '@lib/types'

jest.mock('@lib/cta-alerts', () => ({
  fetchCTAAlerts: jest.fn(),
}))
const mockFetch = fetchCTAAlerts as jest.MockedFunction<typeof fetchCTAAlerts>

function makeAlert(
  id: string,
  routes: { routeId: string; routeName: string; color: string }[],
  headline: string,
  description: string,
): NormalizedAlert {
  return {
    id,
    headline,
    description,
    url: `https://transitchicago.com/alert/${id}`,
    routes: routes.map((r) => ({ ...r, textColor: '#ffffff' })),
    severity: '25',
    isMajor: false,
    impact: 'Planned Work',
    startTime: '2026-04-01T00:00:00',
    endTime: null,
    service: 'cta',
  }
}

const sampleAlerts: NormalizedAlert[] = [
  makeAlert(
    '1',
    [{ routeId: 'Red', routeName: 'Red Line', color: '#c60c30' }],
    'Red Line Signal Work',
    'Expect delays near Clark/Division',
  ),
  makeAlert(
    '2',
    [{ routeId: 'Blue', routeName: 'Blue Line', color: '#00a1de' }],
    'Blue Line Track Maintenance',
    "Shuttle buses between Rosemont and O'Hare",
  ),
  makeAlert(
    '3',
    [{ routeId: 'Brn', routeName: 'Brown Line', color: '#62361b' }],
    'Brown Line Station Work',
    'Armitage station closed for rehab',
  ),
  makeAlert(
    '4',
    [
      { routeId: 'Red', routeName: 'Red Line', color: '#c60c30' },
      { routeId: 'Blue', routeName: 'Blue Line', color: '#00a1de' },
    ],
    'Systemwide Alert',
    'Service changes this weekend',
  ),
]

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers({
    doNotFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'setImmediate',
      'clearImmediate',
      'nextTick',
      'queueMicrotask',
    ],
  })
})

afterEach(() => {
  jest.useRealTimers()
})

describe('CTAAlerts', () => {
  it('shows skeleton loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<CTAAlerts />)
    expect(screen.getByText('Service Alerts')).toBeInTheDocument()
  })

  it('renders alert cards after successful fetch', async () => {
    mockFetch.mockResolvedValue(sampleAlerts)
    render(<CTAAlerts />)
    await waitFor(() => {
      expect(screen.getByText('Red Line Signal Work')).toBeInTheDocument()
      expect(screen.getByText('Blue Line Track Maintenance')).toBeInTheDocument()
      expect(screen.getByText('Brown Line Station Work')).toBeInTheDocument()
    })
  })

  it('shows alert count in header', async () => {
    mockFetch.mockResolvedValue(sampleAlerts)
    render(<CTAAlerts />)
    await waitFor(() => {
      expect(screen.getByText('4 Service Alerts')).toBeInTheDocument()
    })
  })

  it('shows description text in cards', async () => {
    mockFetch.mockResolvedValue(sampleAlerts)
    render(<CTAAlerts />)
    await waitFor(() => {
      expect(screen.getByText('Expect delays near Clark/Division')).toBeInTheDocument()
      expect(screen.getByText('Armitage station closed for rehab')).toBeInTheDocument()
    })
  })

  it('renders filter chips for active routes', async () => {
    mockFetch.mockResolvedValue(sampleAlerts)
    render(<CTAAlerts />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Red Line' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Blue Line' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Brown Line' })).toBeInTheDocument()
    })
  })

  it('filters alerts when a line chip is clicked', async () => {
    mockFetch.mockResolvedValue(sampleAlerts)
    render(<CTAAlerts />)

    await waitFor(() => {
      expect(screen.getByText('Red Line Signal Work')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Brown Line' }))

    expect(screen.getByText('Brown Line Station Work')).toBeInTheDocument()
    expect(screen.queryByText('Blue Line Track Maintenance')).not.toBeInTheDocument()
  })

  it('shows all alerts when All chip is clicked after filtering', async () => {
    mockFetch.mockResolvedValue(sampleAlerts)
    render(<CTAAlerts />)

    await waitFor(() => {
      expect(screen.getByText('Red Line Signal Work')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Brown Line' }))
    expect(screen.queryByText('Red Line Signal Work')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByText('Red Line Signal Work')).toBeInTheDocument()
    expect(screen.getByText('Brown Line Station Work')).toBeInTheDocument()
  })

  it('shows empty state when no alerts exist', async () => {
    mockFetch.mockResolvedValue([])
    render(<CTAAlerts />)
    await waitFor(() => {
      expect(screen.getByText('No active service alerts')).toBeInTheDocument()
    })
  })

  it('shows error message and retry button on failure', async () => {
    mockFetch.mockRejectedValue(new Error('CTA Alerts API error: 500'))
    render(<CTAAlerts />)
    await waitFor(() => {
      expect(
        screen.getByText('Failed to load alerts: CTA Alerts API error: 500'),
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    })
  })

  it('renders More info links', async () => {
    mockFetch.mockResolvedValue(sampleAlerts)
    render(<CTAAlerts />)
    await waitFor(() => {
      const links = screen.getAllByText('More info')
      expect(links.length).toBe(4)
      expect(links[0].closest('a')).toHaveAttribute('href', 'https://transitchicago.com/alert/1')
    })
  })

  it('shows line badge pills with service names', async () => {
    mockFetch.mockResolvedValue(sampleAlerts)
    render(<CTAAlerts />)
    await waitFor(() => {
      const redBadges = screen.getAllByText('Red Line')
      expect(redBadges.length).toBeGreaterThanOrEqual(1)
    })
  })
})

const redLine = {
  slug: 'red',
  name: 'Red Line',
  shortName: 'Red',
} as Parameters<typeof CTAAlerts>[0]['line']

describe('CTAAlerts with line prop', () => {
  it('pre-filters to the given line via routeId', async () => {
    mockFetch.mockResolvedValue([sampleAlerts[0], sampleAlerts[3]])
    render(<CTAAlerts line={redLine} />)
    await waitFor(() => {
      expect(screen.getByText('Red Line Signal Work')).toBeInTheDocument()
    })
    expect(mockFetch).toHaveBeenCalledWith('Red')
  })

  it('shows filtered count in header', async () => {
    mockFetch.mockResolvedValue([sampleAlerts[0], sampleAlerts[3]])
    render(<CTAAlerts line={redLine} />)
    await waitFor(() => {
      expect(screen.getByText('2 Service Alerts')).toBeInTheDocument()
    })
  })

  it('still renders filter chips when line is passed without hideChips', async () => {
    mockFetch.mockResolvedValue([sampleAlerts[0], sampleAlerts[3]])
    render(<CTAAlerts line={redLine} />)
    await waitFor(() => {
      expect(screen.getByText('Red Line Signal Work')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Red Line' })).toBeInTheDocument()
  })

  it('hides filter chips when hideChips is set', async () => {
    mockFetch.mockResolvedValue([sampleAlerts[0]])
    render(<CTAAlerts line={redLine} hideChips />)
    await waitFor(() => {
      expect(screen.getByText('Red Line Signal Work')).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: 'All' })).not.toBeInTheDocument()
  })

  it('shows empty state without Show all button when line has no alerts', async () => {
    const yellowLine = { slug: 'yellow', name: 'Yellow Line', shortName: 'Yellow' } as Parameters<
      typeof CTAAlerts
    >[0]['line']
    mockFetch.mockResolvedValue([])
    render(<CTAAlerts line={yellowLine} />)
    await waitFor(() => {
      expect(screen.getByText('No alerts for Yellow Line')).toBeInTheDocument()
    })
    expect(screen.queryByText('Show all alerts')).not.toBeInTheDocument()
  })
})

describe('CTAAlerts with limit prop', () => {
  it('shows only the limited number of cards', async () => {
    mockFetch.mockResolvedValue(sampleAlerts)
    render(<CTAAlerts limit={2} />)
    await waitFor(() => {
      expect(screen.getByText('Red Line Signal Work')).toBeInTheDocument()
      expect(screen.getByText('Blue Line Track Maintenance')).toBeInTheDocument()
    })
    expect(screen.queryByText('Brown Line Station Work')).not.toBeInTheDocument()
  })

  it('renders a "View all" link when alerts exceed the limit', async () => {
    mockFetch.mockResolvedValue(sampleAlerts)
    render(<CTAAlerts limit={2} />)
    await waitFor(() => {
      const link = screen.getByText(/View all 4 alerts/)
      expect(link.closest('a')).toHaveAttribute('href', '/cta/alerts')
    })
  })

  it('does not render a "View all" link when alerts fit within the limit', async () => {
    mockFetch.mockResolvedValue([sampleAlerts[0]])
    render(<CTAAlerts limit={3} />)
    await waitFor(() => {
      expect(screen.getByText('Red Line Signal Work')).toBeInTheDocument()
    })
    expect(screen.queryByText(/View all/)).not.toBeInTheDocument()
  })
})
