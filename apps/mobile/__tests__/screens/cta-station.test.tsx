import { render, screen } from '@testing-library/react-native'
import { mockStation, mockSchedule } from '../fixtures'
import { useStation, useSchedule } from '../../lib/hooks'
import CtaStationDetailScreen from '../../app/cta/station/[station]'

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ station: 'clark-lake' }),
}))

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
    expect(screen.getByText('To Howard')).toBeOnTheScreen()
  })
})
