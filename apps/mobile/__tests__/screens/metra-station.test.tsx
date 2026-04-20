import { render, screen } from '@testing-library/react-native'
import { mockMetraStation, mockSchedule } from '../fixtures'
import { useStation, useSchedule } from '../../lib/hooks'
import MetraStationDetailScreen from '../../app/(tabs)/metra/station/[station]'

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ station: 'aurora' }),
}))

jest.mock('@expo/vector-icons/Ionicons', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return {
    __esModule: true,
    default: ({ name }: { name: string }) => <Text>{name}</Text>,
  }
})

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

describe('MetraStationDetailScreen', () => {
  it('shows loading state while the station is loading', () => {
    mockUseStation.mockReturnValue({ station: null, loading: true })
    mockUseSchedule.mockReturnValue({ schedule: null, loading: true })
    render(<MetraStationDetailScreen />)
    expect(screen.queryByText('Aurora')).toBeNull()
  })

  it('renders station details, info, and schedule when data is loaded', () => {
    mockUseStation.mockReturnValue({ station: mockMetraStation, loading: false })
    mockUseSchedule.mockReturnValue({ schedule: mockSchedule, loading: false })
    render(<MetraStationDetailScreen />)
    expect(screen.getByText('Aurora')).toBeOnTheScreen()
    expect(screen.getByText('233 N Broadway, Aurora, IL')).toBeOnTheScreen()
    expect(screen.getByText('Parking')).toBeOnTheScreen()
    expect(screen.getByText('Schedule')).toBeOnTheScreen()
  })

  it('renders Metra service badge', () => {
    mockUseStation.mockReturnValue({ station: mockMetraStation, loading: false })
    mockUseSchedule.mockReturnValue({ schedule: null, loading: true })
    render(<MetraStationDetailScreen />)
    expect(screen.getByText('Metra')).toBeOnTheScreen()
  })

  it('renders Terminal badge when station is a terminal', () => {
    mockUseStation.mockReturnValue({ station: mockMetraStation, loading: false })
    mockUseSchedule.mockReturnValue({ schedule: null, loading: true })
    render(<MetraStationDetailScreen />)
    expect(screen.getByText('Terminal')).toBeOnTheScreen()
  })

  it('renders CTA + Metra service badge for dual-service stations', () => {
    const dualStation = { ...mockMetraStation, service: 'both' as const }
    mockUseStation.mockReturnValue({ station: dualStation, loading: false })
    mockUseSchedule.mockReturnValue({ schedule: null, loading: true })
    render(<MetraStationDetailScreen />)
    expect(screen.getByText('CTA + Metra')).toBeOnTheScreen()
  })

  it('renders line chips for all lines the station serves', () => {
    mockUseStation.mockReturnValue({ station: mockMetraStation, loading: false })
    mockUseSchedule.mockReturnValue({ schedule: null, loading: true })
    render(<MetraStationDetailScreen />)
    expect(screen.getByText('BNSF')).toBeOnTheScreen()
  })

  it('renders ArrivalsCard when schedule data is loaded', () => {
    mockUseStation.mockReturnValue({ station: mockMetraStation, loading: false })
    mockUseSchedule.mockReturnValue({ schedule: mockSchedule, loading: false })
    render(<MetraStationDetailScreen />)
    expect(screen.getByText(/Metra timetable/)).toBeOnTheScreen()
  })
})
