import { render, screen } from '@testing-library/react-native'
import { mockMetraStation, mockSchedule } from '../fixtures'
import { useStation, useSchedule } from '../../lib/hooks'
import MetraStationDetailScreen from '../../app/metra/station/[station]'

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ station: 'aurora' }),
}))

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
})
