import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import MetraAlerts from '@components/MetraAlerts'
import { fetchMetraAlerts } from '@lib/metra-realtime'
import type { NormalizedAlert } from '@lib/types'

jest.mock('@lib/metra-realtime', () => ({
  fetchMetraAlerts: jest.fn(),
}))
const mockFetch = fetchMetraAlerts as jest.MockedFunction<typeof fetchMetraAlerts>

function makeAlert(
  id: string,
  routeId: string,
  headline: string,
  description: string,
): NormalizedAlert {
  return {
    id,
    headline,
    description,
    url: `https://metrarail.com/${routeId}`,
    routes: [{ routeId, routeName: routeId, color: '#1A3D7A', textColor: '#fff' }],
    severity: null,
    isMajor: false,
    impact: null,
    startTime: null,
    endTime: null,
    service: 'metra',
  }
}

const sampleAlerts: NormalizedAlert[] = [
  makeAlert('1', 'MD-N', 'MD-N Construction', 'Platform closed for rehab'),
  makeAlert('2', 'UP-N', 'UPN Elevator Out', 'Kenosha elevator out of service'),
  makeAlert('3', 'UP-N', 'Track Construction', 'Trains may incur delays'),
  makeAlert('4', 'ME', 'MED Power Outage', 'Train traffic halted'),
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

describe('MetraAlerts', () => {
  it('shows skeleton loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<MetraAlerts />)
    expect(screen.getByText('Service Alerts')).toBeInTheDocument()
  })

  it('renders alert cards after successful fetch', async () => {
    mockFetch.mockResolvedValue(sampleAlerts)
    render(<MetraAlerts />)
    await waitFor(() => {
      expect(screen.getByText('MD-N Construction')).toBeInTheDocument()
      expect(screen.getByText('UPN Elevator Out')).toBeInTheDocument()
      expect(screen.getByText('MED Power Outage')).toBeInTheDocument()
    })
  })

  it('shows alert count in header', async () => {
    mockFetch.mockResolvedValue(sampleAlerts)
    render(<MetraAlerts />)
    await waitFor(() => {
      expect(screen.getByText('4 Service Alerts')).toBeInTheDocument()
    })
  })

  it('shows description text in cards', async () => {
    mockFetch.mockResolvedValue(sampleAlerts)
    render(<MetraAlerts />)
    await waitFor(() => {
      expect(screen.getByText('Platform closed for rehab')).toBeInTheDocument()
      expect(screen.getByText('Train traffic halted')).toBeInTheDocument()
    })
  })

  it('renders filter chips for active routes', async () => {
    mockFetch.mockResolvedValue(sampleAlerts)
    render(<MetraAlerts />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'MD-N' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'UP-N' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'ME' })).toBeInTheDocument()
    })
  })

  it('filters alerts when a line chip is clicked', async () => {
    mockFetch.mockResolvedValue(sampleAlerts)
    render(<MetraAlerts />)

    await waitFor(() => {
      expect(screen.getByText('MD-N Construction')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'ME' }))

    expect(screen.getByText('MED Power Outage')).toBeInTheDocument()
    expect(screen.queryByText('MD-N Construction')).not.toBeInTheDocument()
    expect(screen.queryByText('UPN Elevator Out')).not.toBeInTheDocument()
  })

  it('shows all alerts when All chip is clicked after filtering', async () => {
    mockFetch.mockResolvedValue(sampleAlerts)
    render(<MetraAlerts />)

    await waitFor(() => {
      expect(screen.getByText('MD-N Construction')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'ME' }))
    expect(screen.queryByText('MD-N Construction')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByText('MD-N Construction')).toBeInTheDocument()
    expect(screen.getByText('MED Power Outage')).toBeInTheDocument()
  })

  it('shows empty state when no alerts exist', async () => {
    mockFetch.mockResolvedValue([])
    render(<MetraAlerts />)
    await waitFor(() => {
      expect(screen.getByText('No active service alerts')).toBeInTheDocument()
    })
  })

  it('shows error message and retry button on failure', async () => {
    mockFetch.mockRejectedValue(new Error('Metra Alerts API error: 401'))
    render(<MetraAlerts />)
    await waitFor(() => {
      expect(
        screen.getByText('Failed to load alerts: Metra Alerts API error: 401'),
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    })
  })

  it('calls fetchMetraAlerts without routeId', async () => {
    mockFetch.mockResolvedValue([])
    render(<MetraAlerts />)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(undefined)
    })
  })

  it('renders More info links', async () => {
    mockFetch.mockResolvedValue(sampleAlerts)
    render(<MetraAlerts />)
    await waitFor(() => {
      const links = screen.getAllByText('More info')
      expect(links.length).toBe(4)
      expect(links[0].closest('a')).toHaveAttribute('href', 'https://metrarail.com/MD-N')
    })
  })

  it('shows friendly line name next to badge', async () => {
    mockFetch.mockResolvedValue(sampleAlerts)
    render(<MetraAlerts />)
    await waitFor(() => {
      expect(screen.getByText('Milwaukee District North')).toBeInTheDocument()
      expect(screen.getByText('Metra Electric')).toBeInTheDocument()
    })
  })
})

const metraLine = {
  metraLineCode: 'UP-N',
  name: 'Union Pacific North Line',
} as Parameters<typeof MetraAlerts>[0]['line']

describe('MetraAlerts with line prop', () => {
  it('pre-filters to the given line', async () => {
    mockFetch.mockResolvedValue(sampleAlerts)
    render(<MetraAlerts line={metraLine} />)
    await waitFor(() => {
      expect(screen.getByText('UPN Elevator Out')).toBeInTheDocument()
      expect(screen.getByText('Track Construction')).toBeInTheDocument()
    })
    expect(screen.queryByText('MD-N Construction')).not.toBeInTheDocument()
    expect(screen.queryByText('MED Power Outage')).not.toBeInTheDocument()
  })

  it('shows filtered count in header', async () => {
    mockFetch.mockResolvedValue(sampleAlerts)
    render(<MetraAlerts line={metraLine} />)
    await waitFor(() => {
      expect(screen.getByText('2 Service Alerts')).toBeInTheDocument()
    })
  })

  it('still renders filter chips when line is passed without hideChips', async () => {
    mockFetch.mockResolvedValue(sampleAlerts)
    render(<MetraAlerts line={metraLine} />)
    await waitFor(() => {
      expect(screen.getByText('UPN Elevator Out')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
  })

  it('hides filter chips when hideChips is set', async () => {
    mockFetch.mockResolvedValue(sampleAlerts)
    render(<MetraAlerts line={metraLine} hideChips />)
    await waitFor(() => {
      expect(screen.getByText('UPN Elevator Out')).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: 'All' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ME' })).not.toBeInTheDocument()
  })

  it('shows empty state without Show all button when line has no alerts', async () => {
    const noMatchLine = { metraLineCode: 'HC' } as Parameters<typeof MetraAlerts>[0]['line']
    mockFetch.mockResolvedValue(sampleAlerts)
    render(<MetraAlerts line={noMatchLine} />)
    await waitFor(() => {
      expect(screen.getByText('No alerts for Heritage Corridor')).toBeInTheDocument()
    })
    expect(screen.queryByText('Show all alerts')).not.toBeInTheDocument()
  })
})

describe('MetraAlerts with limit prop', () => {
  it('shows only the limited number of cards', async () => {
    mockFetch.mockResolvedValue(sampleAlerts)
    render(<MetraAlerts limit={2} />)
    await waitFor(() => {
      expect(screen.getByText('MD-N Construction')).toBeInTheDocument()
      expect(screen.getByText('UPN Elevator Out')).toBeInTheDocument()
    })
    expect(screen.queryByText('Track Construction')).not.toBeInTheDocument()
    expect(screen.queryByText('MED Power Outage')).not.toBeInTheDocument()
  })

  it('renders a "View all" link when alerts exceed the limit', async () => {
    mockFetch.mockResolvedValue(sampleAlerts)
    render(<MetraAlerts limit={2} />)
    await waitFor(() => {
      const link = screen.getByText(/View all 4 alerts/)
      expect(link.closest('a')).toHaveAttribute('href', '/metra/alerts')
    })
  })

  it('does not render a "View all" link when alerts fit within the limit', async () => {
    mockFetch.mockResolvedValue([sampleAlerts[0]])
    render(<MetraAlerts limit={3} />)
    await waitFor(() => {
      expect(screen.getByText('MD-N Construction')).toBeInTheDocument()
    })
    expect(screen.queryByText(/View all/)).not.toBeInTheDocument()
  })
})
