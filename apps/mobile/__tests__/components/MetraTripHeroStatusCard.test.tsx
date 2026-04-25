import { render, screen } from '@testing-library/react-native'
import MetraTripHeroStatusCard from '../../components/MetraTripHeroStatusCard'
import type { DerivedStop, TripStop } from '@ctt/shared'

const RED = '#c60c30'

const firstStop: TripStop = {
  sequence: 1,
  stationName: 'Aurora',
  slug: 'aurora',
  arrival: '5:30 AM',
  departure: '5:30 AM',
}
const lastStop: TripStop = {
  sequence: 4,
  stationName: 'Union Station',
  slug: 'union-station',
  arrival: '6:30 AM',
  departure: '6:30 AM',
}

const currentDerived: DerivedStop = {
  stop: {
    sequence: 2,
    stationName: 'Naperville',
    slug: 'naperville',
    arrival: '5:45 AM',
    departure: '5:46 AM',
  },
  status: 'current',
  delayMinutes: 4,
  skipped: false,
  etaEpoch: null,
}

describe('MetraTripHeroStatusCard', () => {
  it('renders the status label and "Live status" header', () => {
    render(
      <MetraTripHeroStatusCard
        status={{ label: 'On time', tone: 'ontime' }}
        phase="active"
        currentDerived={currentDerived}
        firstStop={firstStop}
        lastStop={lastStop}
        vehiclePosition={null}
        lineColor={RED}
        error={null}
        nowMs={Date.now()}
      />,
    )
    expect(screen.getByText('Live status')).toBeOnTheScreen()
    expect(screen.getByText('On time')).toBeOnTheScreen()
  })

  it('renders the right panel as "Next stop" with the current station while active', () => {
    render(
      <MetraTripHeroStatusCard
        status={{ label: 'Delayed 4 min', tone: 'delayed' }}
        phase="active"
        currentDerived={currentDerived}
        firstStop={firstStop}
        lastStop={lastStop}
        vehiclePosition={null}
        lineColor={RED}
        error={null}
        nowMs={Date.now()}
      />,
    )
    expect(screen.getByText('Next stop')).toBeOnTheScreen()
    expect(screen.getByText('Naperville')).toBeOnTheScreen()
  })

  it('renders "Departs" with the first stop when phase is scheduled', () => {
    render(
      <MetraTripHeroStatusCard
        status={{ label: 'Scheduled', tone: 'scheduled' }}
        phase="scheduled"
        currentDerived={undefined}
        firstStop={firstStop}
        lastStop={lastStop}
        vehiclePosition={null}
        lineColor={RED}
        error={null}
        nowMs={Date.now()}
      />,
    )
    expect(screen.getByText('Departs')).toBeOnTheScreen()
    expect(screen.getByText('Aurora')).toBeOnTheScreen()
  })

  it('renders "Arrived" with the last stop when phase is completed', () => {
    render(
      <MetraTripHeroStatusCard
        status={{ label: 'Completed', tone: 'completed' }}
        phase="completed"
        currentDerived={undefined}
        firstStop={firstStop}
        lastStop={lastStop}
        vehiclePosition={null}
        lineColor={RED}
        error={null}
        nowMs={Date.now()}
      />,
    )
    expect(screen.getByText('Arrived')).toBeOnTheScreen()
    expect(screen.getByText('Union Station')).toBeOnTheScreen()
  })

  it('shows a feed error message when error is non-null', () => {
    render(
      <MetraTripHeroStatusCard
        status={{ label: 'On time', tone: 'ontime' }}
        phase="active"
        currentDerived={currentDerived}
        firstStop={firstStop}
        lastStop={lastStop}
        vehiclePosition={null}
        lineColor={RED}
        error="network down"
        nowMs={Date.now()}
      />,
    )
    expect(screen.getByText('Live feed error: network down')).toBeOnTheScreen()
  })
})
