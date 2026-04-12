import { render, screen } from '@testing-library/react'
import CtaServicePulse, { type DirectionPulse } from '@components/CtaServicePulse'

const sampleDirections: DirectionPulse[] = [
  {
    terminalName: 'Howard',
    trainCount: 8,
    delayedCount: 0,
    nextArrivalMinutes: 3,
    nextArrivalNearStation: 'Clark/Lake',
    healthLabel: 'Running normally',
    healthTone: 'normal',
  },
  {
    terminalName: '95th/Dan Ryan',
    trainCount: 6,
    delayedCount: 2,
    nextArrivalMinutes: 5,
    nextArrivalNearStation: 'Roosevelt',
    healthLabel: 'Minor delays',
    healthTone: 'minor',
  },
]

describe('CtaServicePulse', () => {
  it('renders one card per direction with terminal name and health label', () => {
    render(<CtaServicePulse directions={sampleDirections} lineColor="#c60c30" />)
    expect(screen.getByText('To Howard')).toBeInTheDocument()
    expect(screen.getByText('To 95th/Dan Ryan')).toBeInTheDocument()
    expect(screen.getByText('Running normally')).toBeInTheDocument()
    expect(screen.getByText('Minor delays')).toBeInTheDocument()
  })

  it('renders train count, next arrival, and delay summary when > 0', () => {
    render(<CtaServicePulse directions={sampleDirections} lineColor="#c60c30" />)
    expect(screen.getByText('8 trains running')).toBeInTheDocument()
    expect(screen.getAllByText(/Next train in/)).toHaveLength(2)
    expect(screen.getByText(/Clark\/Lake/)).toBeInTheDocument()
    expect(screen.getByText('2 of 6 trains delayed')).toBeInTheDocument()
  })

  it('hides the delay summary when delayedCount is 0', () => {
    render(<CtaServicePulse directions={[sampleDirections[0]]} lineColor="#c60c30" />)
    expect(screen.queryByText(/trains delayed/)).not.toBeInTheDocument()
  })

  it('renders a data-tone attribute matching each direction tone', () => {
    const { container } = render(
      <CtaServicePulse directions={sampleDirections} lineColor="#c60c30" />,
    )
    const tones = Array.from(container.querySelectorAll('[data-tone]')).map((el) =>
      el.getAttribute('data-tone'),
    )
    expect(tones).toEqual(['normal', 'minor'])
  })

  it('renders the CTA Train Tracker attribution footer', () => {
    render(<CtaServicePulse directions={sampleDirections} lineColor="#c60c30" />)
    expect(screen.getByText(/Powered by CTA Train Tracker/)).toBeInTheDocument()
    expect(screen.getByText(/trademark of the Chicago Transit Authority/)).toBeInTheDocument()
  })

  it('renders the alert snippet when provided', () => {
    render(
      <CtaServicePulse
        directions={sampleDirections}
        lineColor="#c60c30"
        alertSnippet="Elevator out at Clark/Lake"
      />,
    )
    expect(screen.getByText(/Elevator out at Clark\/Lake/)).toBeInTheDocument()
  })

  it('renders an error state when error is set', () => {
    render(<CtaServicePulse directions={[]} lineColor="#c60c30" error="Network down" />)
    expect(screen.getByText(/Live service data unavailable/)).toBeInTheDocument()
  })

  it('renders a skeleton while loading with no directions yet', () => {
    const { container } = render(<CtaServicePulse directions={[]} lineColor="#c60c30" loading />)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })
})
