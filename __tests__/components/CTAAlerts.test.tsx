import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import CTAAlerts from '@/app/components/CTAAlerts'
import { fetchCTAAlerts } from '../../app/lib/cta-alerts'

jest.mock('../../app/lib/cta-alerts', () => {
  const actual = jest.requireActual('../../app/lib/cta-alerts')
  return {
    ...actual,
    fetchCTAAlerts: jest.fn(),
  }
})
const mockFetch = fetchCTAAlerts as jest.MockedFunction<typeof fetchCTAAlerts>

function makeAlert(
  id: string,
  services: { ServiceId: string; ServiceName: string; ServiceBackColor: string }[],
  headline: string,
  description: string,
) {
  return {
    AlertId: id,
    Headline: headline,
    ShortDescription: description,
    FullDescription: { '#cdata-section': '<p>Test</p>' },
    SeverityScore: '25',
    SeverityColor: '#ff0000',
    SeverityCSS: 'planned',
    Impact: 'Planned Work',
    EventStart: '2026-04-01T00:00:00',
    EventEnd: null,
    TBD: '0',
    MajorAlert: '1',
    AlertURL: { '#cdata-section': `https://transitchicago.com/alert/${id}` },
    ImpactedService: {
      Service: services.map((s) => ({
        ServiceType: 'R',
        ServiceTypeDescription: 'Route',
        ServiceName: s.ServiceName,
        ServiceId: s.ServiceId,
        ServiceBackColor: s.ServiceBackColor,
        ServiceTextColor: 'ffffff',
        ServiceURL: { '#cdata-section': 'https://transitchicago.com' },
      })),
    },
  }
}

const sampleAlerts = [
  makeAlert(
    '1',
    [{ ServiceId: 'Red', ServiceName: 'Red Line', ServiceBackColor: 'c60c30' }],
    'Red Line Signal Work',
    'Expect delays near Clark/Division',
  ),
  makeAlert(
    '2',
    [{ ServiceId: 'Blue', ServiceName: 'Blue Line', ServiceBackColor: '00a1de' }],
    'Blue Line Track Maintenance',
    "Shuttle buses between Rosemont and O'Hare",
  ),
  makeAlert(
    '3',
    [{ ServiceId: 'Brn', ServiceName: 'Brown Line', ServiceBackColor: '62361b' }],
    'Brown Line Station Work',
    'Armitage station closed for rehab',
  ),
  makeAlert(
    '4',
    [
      { ServiceId: 'Red', ServiceName: 'Red Line', ServiceBackColor: 'c60c30' },
      { ServiceId: 'Blue', ServiceName: 'Blue Line', ServiceBackColor: '00a1de' },
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
    mockFetch.mockResolvedValue(sampleAlerts as never)
    render(<CTAAlerts />)
    await waitFor(() => {
      expect(screen.getByText('Red Line Signal Work')).toBeInTheDocument()
      expect(screen.getByText('Blue Line Track Maintenance')).toBeInTheDocument()
      expect(screen.getByText('Brown Line Station Work')).toBeInTheDocument()
    })
  })

  it('shows alert count in header', async () => {
    mockFetch.mockResolvedValue(sampleAlerts as never)
    render(<CTAAlerts />)
    await waitFor(() => {
      expect(screen.getByText('4 Service Alerts')).toBeInTheDocument()
    })
  })

  it('shows description text in cards', async () => {
    mockFetch.mockResolvedValue(sampleAlerts as never)
    render(<CTAAlerts />)
    await waitFor(() => {
      expect(screen.getByText('Expect delays near Clark/Division')).toBeInTheDocument()
      expect(screen.getByText('Armitage station closed for rehab')).toBeInTheDocument()
    })
  })

  it('renders filter chips for active routes', async () => {
    mockFetch.mockResolvedValue(sampleAlerts as never)
    render(<CTAAlerts />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Red Line' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Blue Line' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Brown Line' })).toBeInTheDocument()
    })
  })

  it('filters alerts when a line chip is clicked', async () => {
    mockFetch.mockResolvedValue(sampleAlerts as never)
    render(<CTAAlerts />)

    await waitFor(() => {
      expect(screen.getByText('Red Line Signal Work')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Brown Line' }))

    expect(screen.getByText('Brown Line Station Work')).toBeInTheDocument()
    expect(screen.queryByText('Blue Line Track Maintenance')).not.toBeInTheDocument()
  })

  it('shows all alerts when All chip is clicked after filtering', async () => {
    mockFetch.mockResolvedValue(sampleAlerts as never)
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
    mockFetch.mockRejectedValue(new Error('CTA API error: 500'))
    render(<CTAAlerts />)
    await waitFor(() => {
      expect(screen.getByText('Failed to load alerts: CTA API error: 500')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    })
  })

  it('renders More info links', async () => {
    mockFetch.mockResolvedValue(sampleAlerts as never)
    render(<CTAAlerts />)
    await waitFor(() => {
      const links = screen.getAllByText('More info')
      expect(links.length).toBe(4)
      expect(links[0].closest('a')).toHaveAttribute('href', 'https://transitchicago.com/alert/1')
    })
  })

  it('shows line badge pills with service names', async () => {
    mockFetch.mockResolvedValue(sampleAlerts as never)
    render(<CTAAlerts />)
    await waitFor(() => {
      // The systemwide alert should show both Red Line and Blue Line badges
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
  it('pre-filters to the given line via routeid', async () => {
    mockFetch.mockResolvedValue([sampleAlerts[0], sampleAlerts[3]] as never)
    render(<CTAAlerts line={redLine} />)
    await waitFor(() => {
      expect(screen.getByText('Red Line Signal Work')).toBeInTheDocument()
    })
    expect(mockFetch).toHaveBeenCalledWith('Red')
  })

  it('shows filtered count in header', async () => {
    mockFetch.mockResolvedValue([sampleAlerts[0], sampleAlerts[3]] as never)
    render(<CTAAlerts line={redLine} />)
    await waitFor(() => {
      expect(screen.getByText('2 Service Alerts')).toBeInTheDocument()
    })
  })

  it('does not render filter chips', async () => {
    mockFetch.mockResolvedValue([sampleAlerts[0]] as never)
    render(<CTAAlerts line={redLine} />)
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
