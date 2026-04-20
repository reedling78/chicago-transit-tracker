import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react-native'
import StationTimeline from '../../components/StationTimeline'
import { mockStation, mockMetraStation } from '../fixtures'

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}))

jest.mock('react-native-svg', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native')
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => <View {...props} />,
    Circle: () => null,
    Path: () => null,
  }
})

describe('StationTimeline', () => {
  const defaultProps = {
    stations: [mockStation],
    lineColor: '#c60c30',
    stationHrefPrefix: '/cta/station',
    currentLine: 'Red',
  }

  it('renders station names', () => {
    render(<StationTimeline {...defaultProps} />)
    expect(screen.getByText('Clark/Lake')).toBeOnTheScreen()
  })

  it('renders transfer chips for multi-line stations', () => {
    render(<StationTimeline {...defaultProps} />)
    // mockStation has lines: ['Red', 'Blue', 'Green', 'Brown', 'Purple', 'Pink', 'Orange']
    // currentLine is 'Red', so transfer chips should show the other 6
    expect(screen.getByText('Blue')).toBeOnTheScreen()
    expect(screen.getByText('Green')).toBeOnTheScreen()
    expect(screen.getByText('Brown')).toBeOnTheScreen()
    expect(screen.getByText('Purple')).toBeOnTheScreen()
    expect(screen.getByText('Pink')).toBeOnTheScreen()
    expect(screen.getByText('Orange')).toBeOnTheScreen()
    // Red should NOT appear as a chip
    expect(screen.queryByText('Red')).toBeNull()
  })

  it('does not render transfer chips for single-line stations', () => {
    render(
      <StationTimeline
        stations={[mockMetraStation]}
        lineColor="#1A3D7A"
        stationHrefPrefix="/metra/station"
        currentLine="BNSF"
      />,
    )
    expect(screen.getByText('Aurora')).toBeOnTheScreen()
    // BNSF is the only line, so no chips should render
    expect(screen.queryByText('BNSF')).toBeNull()
  })

  it('shows ADA icon for accessible stations', () => {
    render(<StationTimeline {...defaultProps} />)
    expect(screen.getByLabelText('ADA Accessible')).toBeOnTheScreen()
  })

  it('does not show ADA icon for non-accessible stations', () => {
    const nonAdaStation = {
      ...mockStation,
      accessibility: { ada: false, elevator: false, escalator: false },
    }
    render(<StationTimeline {...defaultProps} stations={[nonAdaStation]} />)
    expect(screen.queryByLabelText('ADA Accessible')).toBeNull()
  })

  it('renders the correct number of stations', () => {
    const stations = [
      { ...mockStation, slug: 'station-1', name: 'Station One' },
      { ...mockStation, slug: 'station-2', name: 'Station Two' },
      { ...mockStation, slug: 'station-3', name: 'Station Three' },
    ]
    render(<StationTimeline {...defaultProps} stations={stations} />)
    expect(screen.getByText('Station One')).toBeOnTheScreen()
    expect(screen.getByText('Station Two')).toBeOnTheScreen()
    expect(screen.getByText('Station Three')).toBeOnTheScreen()
  })

  it('renders arrow indicators', () => {
    render(<StationTimeline {...defaultProps} />)
    expect(screen.getByText('→')).toBeOnTheScreen()
  })
})
