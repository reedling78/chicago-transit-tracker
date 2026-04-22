import { render, screen, fireEvent } from '@testing-library/react-native'
import { MetraTimetable } from '../../components/MetraTimetable'
import { mockStationTrips } from '../fixtures'

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('@expo/vector-icons/Ionicons', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return {
    __esModule: true,
    default: ({ name }: { name: string }) => <Text>{name}</Text>,
  }
})

// Force weekday as the default service type for deterministic tests
beforeEach(() => {
  jest.spyOn(Date.prototype, 'getDay').mockReturnValue(1) // Monday
  mockPush.mockClear()
})
afterEach(() => jest.restoreAllMocks())

describe('MetraTimetable', () => {
  it('renders trip rows with departure time, headsign, and train number', () => {
    render(<MetraTimetable stationTrips={mockStationTrips} />)
    expect(screen.getByText('5:30 AM')).toBeOnTheScreen()
    expect(screen.getAllByText('To Chicago Union Station').length).toBeGreaterThan(0)
    expect(screen.getByText('Train 1200')).toBeOnTheScreen()
  })

  it('renders a tappable row with the train detail href as a testID', () => {
    render(<MetraTimetable stationTrips={mockStationTrips} />)
    expect(
      screen.getByTestId('timetable-row:/(tabs)/metra/bnsf/train/BNSF_BN1200_V4_A'),
    ).toBeOnTheScreen()
    expect(
      screen.getByTestId('timetable-row:/(tabs)/metra/bnsf/train/BNSF_BN1205_V4_A'),
    ).toBeOnTheScreen()
  })

  it('pushes the train detail route when a row is pressed', () => {
    render(<MetraTimetable stationTrips={mockStationTrips} />)
    fireEvent.press(screen.getByTestId('timetable-row:/(tabs)/metra/bnsf/train/BNSF_BN1200_V4_A'))
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/metra/bnsf/train/BNSF_BN1200_V4_A')
  })

  it('renders direction filter buttons', () => {
    render(<MetraTimetable stationTrips={mockStationTrips} />)
    expect(screen.getByText('All')).toBeOnTheScreen()
    expect(screen.getByText('Inbound')).toBeOnTheScreen()
    expect(screen.getByText('Outbound')).toBeOnTheScreen()
  })

  it('filters to inbound trips when Inbound is pressed', () => {
    render(<MetraTimetable stationTrips={mockStationTrips} />)
    fireEvent.press(screen.getByText('Inbound'))
    // mockStationTrips weekday inbound (directionId=1): trains 1200, 1210
    expect(screen.getByText('Train 1200')).toBeOnTheScreen()
    expect(screen.getByText('Train 1210')).toBeOnTheScreen()
    // outbound train 1205 should be hidden
    expect(screen.queryByText('Train 1205')).toBeNull()
  })

  it('filters to outbound trips when Outbound is pressed', () => {
    render(<MetraTimetable stationTrips={mockStationTrips} />)
    fireEvent.press(screen.getByText('Outbound'))
    // mockStationTrips weekday outbound (directionId=0): train 1205
    expect(screen.getByText('Train 1205')).toBeOnTheScreen()
    expect(screen.queryByText('Train 1200')).toBeNull()
    expect(screen.queryByText('Train 1210')).toBeNull()
  })

  it('switches service type when a tab is pressed', () => {
    render(<MetraTimetable stationTrips={mockStationTrips} />)
    fireEvent.press(screen.getByText('Saturday'))
    // mockStationTrips saturday: one trip (train 2000)
    expect(screen.getByText('Train 2000')).toBeOnTheScreen()
    expect(screen.queryByText('Train 1200')).toBeNull()
  })

  it('shows empty message when no trips for selected service type', () => {
    render(<MetraTimetable stationTrips={mockStationTrips} />)
    fireEvent.press(screen.getByText('Sunday'))
    // mockStationTrips sunday is empty
    expect(screen.getByText(/No Sunday service/)).toBeOnTheScreen()
  })

  it('shows empty message when direction filter yields no results', () => {
    render(<MetraTimetable stationTrips={mockStationTrips} />)
    fireEvent.press(screen.getByText('Saturday'))
    fireEvent.press(screen.getByText('Outbound'))
    // Saturday only has one inbound trip (directionId=1)
    expect(screen.getByText(/No Saturday service/)).toBeOnTheScreen()
  })
})
