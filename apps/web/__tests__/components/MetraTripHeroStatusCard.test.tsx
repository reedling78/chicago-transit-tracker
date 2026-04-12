import { render, screen } from '@testing-library/react'
import MetraTripHeroStatusCard from '@components/MetraTripHeroStatusCard'
import type { TripStop } from '@lib/metra-status'

const firstStop: TripStop = {
  sequence: 1,
  stationName: 'Aurora',
  slug: 'aurora',
  arrival: '5:30 AM',
  departure: '5:30 AM',
}
const midStop: TripStop = {
  sequence: 2,
  stationName: 'Naperville',
  slug: 'naperville',
  arrival: '5:45 AM',
  departure: '5:46 AM',
}
const lastStop: TripStop = {
  sequence: 4,
  stationName: 'Union Station',
  slug: 'union-station',
  arrival: '6:30 AM',
  departure: '6:30 AM',
}

describe('MetraTripHeroStatusCard', () => {
  it('renders the live status label and a Next stop panel when active', () => {
    render(
      <MetraTripHeroStatusCard
        status={{ label: 'On time', tone: 'ontime' }}
        phase="active"
        currentDerived={{
          stop: midStop,
          status: 'current',
          delayMinutes: 0,
          skipped: false,
          etaEpoch: null,
        }}
        firstStop={firstStop}
        lastStop={lastStop}
        vehiclePosition={null}
        lineColor="#1A3D7A"
        error={null}
        nowMs={Date.now()}
      />,
    )

    expect(screen.getByText('On time')).toBeInTheDocument()
    expect(screen.getByText('Next stop')).toBeInTheDocument()
    expect(screen.getByText('Naperville')).toBeInTheDocument()
  })

  it('renders a Departs panel when phase is scheduled', () => {
    render(
      <MetraTripHeroStatusCard
        status={{ label: 'Scheduled', tone: 'scheduled' }}
        phase="scheduled"
        currentDerived={undefined}
        firstStop={firstStop}
        lastStop={lastStop}
        vehiclePosition={null}
        lineColor="#1A3D7A"
        error={null}
        nowMs={Date.now()}
      />,
    )
    expect(screen.getByText('Departs')).toBeInTheDocument()
    expect(screen.getByText('Aurora')).toBeInTheDocument()
    expect(screen.getByText('5:30 AM')).toBeInTheDocument()
  })

  it('renders an Arrived panel when phase is completed', () => {
    render(
      <MetraTripHeroStatusCard
        status={{ label: 'Completed', tone: 'completed' }}
        phase="completed"
        currentDerived={undefined}
        firstStop={firstStop}
        lastStop={lastStop}
        vehiclePosition={null}
        lineColor="#1A3D7A"
        error={null}
        nowMs={Date.now()}
      />,
    )
    expect(screen.getByText('Arrived')).toBeInTheDocument()
    expect(screen.getByText('Union Station')).toBeInTheDocument()
  })

  it('surfaces the error message', () => {
    render(
      <MetraTripHeroStatusCard
        status={{ label: 'On time', tone: 'ontime' }}
        phase="active"
        currentDerived={undefined}
        firstStop={firstStop}
        lastStop={lastStop}
        vehiclePosition={null}
        lineColor="#1A3D7A"
        error="boom"
        nowMs={Date.now()}
      />,
    )
    expect(screen.getByText(/Live feed error: boom/)).toBeInTheDocument()
  })
})
