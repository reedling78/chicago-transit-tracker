import { render, screen } from '@testing-library/react-native'
import { mockStation, mockSchedule } from '../fixtures'
import { useStation, useSchedule } from '../../lib/hooks'
import CtaStationDetailScreen from '../../app/(tabs)/cta/station/[station]'

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ station: 'clark-lake' }),
}))

jest.mock('expo-linear-gradient', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native')
  return {
    LinearGradient: (props: any) => <View {...props} />,
  }
})

jest.mock('../../lib/hooks', () => ({
  useStation: jest.fn(),
  useSchedule: jest.fn(),
}))

const mockUseStation = useStation as jest.MockedFunction<typeof useStation>
const mockUseSchedule = useSchedule as jest.MockedFunction<typeof useSchedule>

describe('CtaStationDetailScreen', () => {
  it('shows loading state while the station is loading', () => {
    mockUseStation.mockReturnValue({ station: null, loading: true })
    mockUseSchedule.mockReturnValue({ schedule: null, loading: true })
    render(<CtaStationDetailScreen />)
    expect(screen.queryByText('Clark/Lake')).toBeNull()
  })

  it('renders station details, amenities, and schedule when data is loaded', () => {
    mockUseStation.mockReturnValue({ station: mockStation, loading: false })
    mockUseSchedule.mockReturnValue({ schedule: mockSchedule, loading: false })
    render(<CtaStationDetailScreen />)
    expect(screen.getByText('Clark/Lake')).toBeOnTheScreen()
    expect(screen.getByText('100 W Lake St, Chicago, IL')).toBeOnTheScreen()
    expect(screen.getByText('ADA')).toBeOnTheScreen()
    expect(screen.getByText('Schedule')).toBeOnTheScreen()
    expect(screen.getAllByText('To Howard').length).toBeGreaterThan(0)
  })

  it('renders 24 Hours badge when station is open 24 hours', () => {
    mockUseStation.mockReturnValue({ station: mockStation, loading: false })
    mockUseSchedule.mockReturnValue({ schedule: null, loading: true })
    render(<CtaStationDetailScreen />)
    expect(screen.getByText('24 Hours')).toBeOnTheScreen()
  })

  it('renders Terminal badge when station is a terminal', () => {
    const terminalStation = { ...mockStation, terminal: true }
    mockUseStation.mockReturnValue({ station: terminalStation, loading: false })
    mockUseSchedule.mockReturnValue({ schedule: null, loading: true })
    render(<CtaStationDetailScreen />)
    expect(screen.getByText('Terminal')).toBeOnTheScreen()
  })

  it('renders line chips for all lines the station serves', () => {
    mockUseStation.mockReturnValue({ station: mockStation, loading: false })
    mockUseSchedule.mockReturnValue({ schedule: null, loading: true })
    render(<CtaStationDetailScreen />)
    expect(screen.getByText('Red')).toBeOnTheScreen()
    expect(screen.getByText('Blue')).toBeOnTheScreen()
  })
})
