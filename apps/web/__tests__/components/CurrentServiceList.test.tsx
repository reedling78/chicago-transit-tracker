import { render, screen } from '@testing-library/react'
import CurrentServiceList, { type CurrentServiceTrain } from '@components/CurrentServiceList'

const sampleTrains: CurrentServiceTrain[] = [
  {
    trainNumber: '1274',
    href: '/metra/bnsf/train/1274',
    destination: 'Aurora',
    nextStop: 'Naperville',
    nextStopEta: '3 min',
    statusLabel: 'On time',
    statusTone: 'ontime',
  },
  {
    trainNumber: '1286',
    href: '/metra/bnsf/train/1286',
    destination: 'Chicago Union Station',
    nextStop: 'Downers Grove',
    nextStopEta: '7 min',
    statusLabel: 'Delayed 5 min',
    statusTone: 'delayed',
  },
  {
    trainNumber: '1290',
    href: '/metra/bnsf/train/1290',
    destination: 'Aurora',
    nextStop: null,
    nextStopEta: null,
    statusLabel: 'Scheduled 4:32 PM',
    statusTone: 'scheduled',
  },
]

describe('CurrentServiceList', () => {
  it('renders a row per train with destination and status pill', () => {
    render(<CurrentServiceList trains={sampleTrains} lineColor="#005595" />)

    expect(screen.getByText('#1274')).toBeInTheDocument()
    expect(screen.getAllByText('Aurora').length).toBe(2)
    expect(screen.getByText('On time')).toBeInTheDocument()

    expect(screen.getByText('#1286')).toBeInTheDocument()
    expect(screen.getByText('Chicago Union Station')).toBeInTheDocument()
    expect(screen.getByText('Delayed 5 min')).toBeInTheDocument()

    expect(screen.getByText('#1290')).toBeInTheDocument()
    expect(screen.getByText('Scheduled 4:32 PM')).toBeInTheDocument()
  })

  it('links each row to the train detail page', () => {
    render(<CurrentServiceList trains={sampleTrains} lineColor="#005595" />)
    const row = screen.getByTestId('current-service-row-1274')
    expect(row.closest('a')).toHaveAttribute('href', '/metra/bnsf/train/1274')
  })

  it('renders next stop and ETA when present', () => {
    render(<CurrentServiceList trains={[sampleTrains[0]]} lineColor="#005595" />)
    expect(screen.getByText(/Next: Naperville/)).toBeInTheDocument()
    expect(screen.getByText('3 min')).toBeInTheDocument()
  })

  it('omits next-stop line when nextStop is null', () => {
    render(<CurrentServiceList trains={[sampleTrains[2]]} lineColor="#005595" />)
    expect(screen.queryByText(/Next:/)).not.toBeInTheDocument()
  })

  it('uses the correct status tone data attribute', () => {
    const { container } = render(<CurrentServiceList trains={sampleTrains} lineColor="#005595" />)
    const tones = Array.from(container.querySelectorAll('[data-tone]')).map((el) =>
      el.getAttribute('data-tone'),
    )
    expect(tones).toEqual(['ontime', 'delayed', 'scheduled'])
  })

  it('shows loading skeletons when loading and no trains yet', () => {
    const { container } = render(<CurrentServiceList trains={[]} lineColor="#005595" loading />)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    expect(screen.queryByText(/No trains currently running/)).not.toBeInTheDocument()
  })

  it('shows the empty message when not loading and no trains', () => {
    render(<CurrentServiceList trains={[]} lineColor="#005595" />)
    expect(screen.getByText(/No trains currently running/)).toBeInTheDocument()
  })

  it('renders a custom empty message when provided', () => {
    render(
      <CurrentServiceList trains={[]} lineColor="#005595" emptyMessage="Next service at 4:32 AM" />,
    )
    expect(screen.getByText('Next service at 4:32 AM')).toBeInTheDocument()
  })

  it('shows the error message when error is set', () => {
    render(<CurrentServiceList trains={[]} lineColor="#005595" error="Network down" />)
    expect(screen.getByText(/Network down/)).toBeInTheDocument()
  })

  it('applies lineColor to the left border', () => {
    const { getByTestId } = render(<CurrentServiceList trains={sampleTrains} lineColor="#ff0000" />)
    expect(getByTestId('current-service-list')).toHaveStyle({
      borderLeftColor: '#ff0000',
    })
  })
})
