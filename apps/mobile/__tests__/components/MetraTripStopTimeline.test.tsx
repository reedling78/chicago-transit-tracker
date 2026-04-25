import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react-native'
import MetraTripStopTimeline from '../../components/MetraTripStopTimeline'
import type { DerivedStop } from '@ctt/shared'

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}))

const RED = '#c60c30'

function makeStop(overrides: Partial<DerivedStop> = {}): DerivedStop {
  return {
    stop: {
      sequence: 1,
      stationName: 'Aurora',
      slug: 'aurora',
      arrival: '6:00 AM',
      departure: '6:00 AM',
    },
    status: 'upcoming',
    delayMinutes: null,
    skipped: false,
    etaEpoch: null,
    ...overrides,
  }
}

describe('MetraTripStopTimeline', () => {
  const stops: DerivedStop[] = [
    makeStop({
      stop: {
        sequence: 1,
        stationName: 'Aurora',
        slug: 'aurora',
        arrival: '5:30 AM',
        departure: '5:30 AM',
      },
      status: 'past',
    }),
    makeStop({
      stop: {
        sequence: 2,
        stationName: 'Naperville',
        slug: 'naperville',
        arrival: '5:45 AM',
        departure: '5:46 AM',
      },
      status: 'current',
      delayMinutes: 4,
    }),
    makeStop({
      stop: {
        sequence: 3,
        stationName: 'Downers Grove',
        slug: 'downers-grove',
        arrival: '6:00 AM',
        departure: '6:01 AM',
      },
      status: 'upcoming',
    }),
    makeStop({
      stop: {
        sequence: 4,
        stationName: 'Union Station',
        slug: 'union-station',
        arrival: '6:30 AM',
        departure: '6:30 AM',
      },
      status: 'upcoming',
      skipped: true,
    }),
  ]

  it('renders every station name with its departure time', () => {
    render(<MetraTripStopTimeline derivedStops={stops} lineColor={RED} lineSlug="bnsf" />)
    expect(screen.getByText('Aurora')).toBeOnTheScreen()
    expect(screen.getByText('Naperville')).toBeOnTheScreen()
    expect(screen.getByText('Downers Grove')).toBeOnTheScreen()
    expect(screen.getByText('Union Station')).toBeOnTheScreen()
    // departure (not arrival) appears
    expect(screen.getByText('5:46 AM')).toBeOnTheScreen()
    expect(screen.getByText('6:01 AM')).toBeOnTheScreen()
  })

  it('renders a "Next stop" pill on the current row', () => {
    render(<MetraTripStopTimeline derivedStops={stops} lineColor={RED} lineSlug="bnsf" />)
    expect(screen.getByText('Next stop')).toBeOnTheScreen()
  })

  it('renders a "Skipped" pill on skipped rows and applies line-through to the station name', () => {
    render(<MetraTripStopTimeline derivedStops={stops} lineColor={RED} lineSlug="bnsf" />)
    expect(screen.getByText('Skipped')).toBeOnTheScreen()
    const skippedName = screen.getByTestId('stop-name-4')
    const flatten = (s: unknown): Record<string, unknown> =>
      Array.isArray(s) ? Object.assign({}, ...s.map(flatten)) : (s as Record<string, unknown>)
    expect(flatten(skippedName.props.style).textDecorationLine).toBe('line-through')
  })

  it('renders the +N min delay chip on delayed non-skipped rows', () => {
    render(<MetraTripStopTimeline derivedStops={stops} lineColor={RED} lineSlug="bnsf" />)
    expect(screen.getByText('+4 min')).toBeOnTheScreen()
  })

  it('uses the halo bullet on the current row and open bullets elsewhere', () => {
    render(<MetraTripStopTimeline derivedStops={stops} lineColor={RED} lineSlug="bnsf" />)
    const halos = screen.getAllByTestId('steps-bullet-halo')
    expect(halos).toHaveLength(1)
    const opens = screen.getAllByTestId('steps-bullet-open')
    // 3 non-current rows
    expect(opens).toHaveLength(3)
  })
})
