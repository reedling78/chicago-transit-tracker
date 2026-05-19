import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react-native'
import { mockMetraStation, mockSchedule, mockStationTrips } from '../fixtures'
import { useStation, useSchedule, useStationTrips } from '../../lib/hooks'
import MetraStationDetailScreen from '../../app/(app)/metra/station/[station]'

jest.mock('expo-router', () => {
  const Stack = () => null
  Stack.displayName = 'Stack'
  const StackScreen = (props: { options?: { headerRight?: () => ReactNode } }) =>
    props.options?.headerRight ? props.options.headerRight() : null
  StackScreen.displayName = 'StackScreen'
  ;(Stack as unknown as { Screen: typeof StackScreen }).Screen = StackScreen
  return {
    useLocalSearchParams: () => ({ station: 'aurora' }),
    useRouter: () => ({ push: jest.fn() }),
    Stack,
  }
})

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

jest.mock('../../lib/useNavHeaderInset', () => ({
  useNavHeaderInset: () => 64,
}))

jest.mock('../../lib/hooks', () => ({
  useStation: jest.fn(),
  useSchedule: jest.fn(),
  useStationTrips: jest.fn(),
}))

const mockUseStation = useStation as jest.MockedFunction<typeof useStation>
const mockUseSchedule = useSchedule as jest.MockedFunction<typeof useSchedule>
const mockUseStationTrips = useStationTrips as jest.MockedFunction<typeof useStationTrips>

describe('MetraStationDetailScreen', () => {
  it('shows loading state while the station is loading', () => {
    mockUseStation.mockReturnValue({ station: null, loading: true })
    mockUseSchedule.mockReturnValue({ schedule: null, loading: true })
    mockUseStationTrips.mockReturnValue({ stationTrips: null, loading: true })
    render(<MetraStationDetailScreen />)
    expect(screen.queryByText('Aurora')).toBeNull()
  })

  it('renders station details, info, and schedule when data is loaded', () => {
    mockUseStation.mockReturnValue({ station: mockMetraStation, loading: false })
    mockUseSchedule.mockReturnValue({ schedule: mockSchedule, loading: false })
    mockUseStationTrips.mockReturnValue({ stationTrips: mockStationTrips, loading: false })
    render(<MetraStationDetailScreen />)
    expect(screen.getByText('Aurora')).toBeOnTheScreen()
    expect(screen.getByText('233 N Broadway, Aurora, IL')).toBeOnTheScreen()
    expect(screen.getByText('Parking')).toBeOnTheScreen()
    expect(screen.getByText('Timetable')).toBeOnTheScreen()
  })

  it('renders the station name as the PageHeader title', () => {
    mockUseStation.mockReturnValue({ station: mockMetraStation, loading: false })
    mockUseSchedule.mockReturnValue({ schedule: null, loading: true })
    mockUseStationTrips.mockReturnValue({ stationTrips: null, loading: true })
    render(<MetraStationDetailScreen />)
    expect(screen.getByText('Aurora')).toBeOnTheScreen()
    expect(screen.getAllByText('BNSF').length).toBeGreaterThan(0)
  })

  it('keeps the full proper station name in the PageHeader title (no short override)', () => {
    mockUseStation.mockReturnValue({
      station: { ...mockMetraStation, name: 'Chicago Union Station' },
      loading: false,
    })
    mockUseSchedule.mockReturnValue({ schedule: null, loading: true })
    mockUseStationTrips.mockReturnValue({ stationTrips: null, loading: true })
    render(<MetraStationDetailScreen />)
    expect(screen.getByText('Chicago Union Station')).toBeOnTheScreen()
    expect(screen.queryByText('Union Station')).toBeNull()
  })

  it('places the favorite button in the PageHeader title row', () => {
    mockUseStation.mockReturnValue({ station: mockMetraStation, loading: false })
    mockUseSchedule.mockReturnValue({ schedule: null, loading: true })
    mockUseStationTrips.mockReturnValue({ stationTrips: null, loading: true })
    render(<MetraStationDetailScreen />)
    const stub = screen.getByTestId('favorite-button-stub')
    expect(stub).toBeOnTheScreen()
    expect(stub.props.children).toBe('station:aurora')
  })

  it('renders Metra service badge', () => {
    mockUseStation.mockReturnValue({ station: mockMetraStation, loading: false })
    mockUseSchedule.mockReturnValue({ schedule: null, loading: true })
    mockUseStationTrips.mockReturnValue({ stationTrips: null, loading: true })
    render(<MetraStationDetailScreen />)
    expect(screen.getByText('Metra')).toBeOnTheScreen()
  })

  it('renders Terminal badge when station is a terminal', () => {
    mockUseStation.mockReturnValue({ station: mockMetraStation, loading: false })
    mockUseSchedule.mockReturnValue({ schedule: null, loading: true })
    mockUseStationTrips.mockReturnValue({ stationTrips: null, loading: true })
    render(<MetraStationDetailScreen />)
    expect(screen.getByText('Terminal')).toBeOnTheScreen()
  })

  it('renders CTA + Metra service badge for dual-service stations', () => {
    const dualStation = { ...mockMetraStation, service: 'both' as const }
    mockUseStation.mockReturnValue({ station: dualStation, loading: false })
    mockUseSchedule.mockReturnValue({ schedule: null, loading: true })
    mockUseStationTrips.mockReturnValue({ stationTrips: null, loading: true })
    render(<MetraStationDetailScreen />)
    expect(screen.getByText('CTA + Metra')).toBeOnTheScreen()
  })

  it('renders line chips for all lines the station serves', () => {
    mockUseStation.mockReturnValue({ station: mockMetraStation, loading: false })
    mockUseSchedule.mockReturnValue({ schedule: null, loading: true })
    mockUseStationTrips.mockReturnValue({ stationTrips: null, loading: true })
    render(<MetraStationDetailScreen />)
    expect(screen.getAllByText('BNSF').length).toBeGreaterThan(0)
  })

  it('renders ArrivalsCard when schedule data is loaded', () => {
    mockUseStation.mockReturnValue({ station: mockMetraStation, loading: false })
    mockUseSchedule.mockReturnValue({ schedule: mockSchedule, loading: false })
    mockUseStationTrips.mockReturnValue({ stationTrips: null, loading: true })
    render(<MetraStationDetailScreen />)
    expect(screen.getByText(/Metra timetable/)).toBeOnTheScreen()
  })

  it('does not render the Footer', () => {
    mockUseStation.mockReturnValue({ station: mockMetraStation, loading: false })
    mockUseSchedule.mockReturnValue({ schedule: null, loading: false })
    mockUseStationTrips.mockReturnValue({ stationTrips: null, loading: false })
    render(<MetraStationDetailScreen />)
    expect(screen.queryByTestId('footer')).toBeNull()
  })
})
