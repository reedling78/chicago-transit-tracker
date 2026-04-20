import { render, waitFor, fireEvent } from '@testing-library/react-native'
import MetraAlerts from '../../components/MetraAlerts'
import { useAlerts } from '../../lib/hooks'
import { mockMetraAlert } from '../fixtures'
import type { NormalizedAlert } from '@ctt/shared'

jest.mock('../../lib/hooks', () => ({
  useAlerts: jest.fn(),
}))
const mockUseAlerts = useAlerts as jest.MockedFunction<typeof useAlerts>

const sampleAlerts: NormalizedAlert[] = [
  mockMetraAlert,
  {
    ...mockMetraAlert,
    id: '3',
    headline: 'Rock Island Construction',
    description: 'Platform work at LaSalle',
    routes: [{ routeId: 'RI', routeName: 'Rock Island', color: '#BE0000', textColor: '#fff' }],
  },
]

afterEach(() => {
  jest.clearAllMocks()
})

describe('MetraAlerts', () => {
  it('shows loading indicator initially', () => {
    mockUseAlerts.mockReturnValue({ alerts: [], loading: true, error: null, retry: jest.fn() })
    const { queryByText } = render(<MetraAlerts />)
    expect(queryByText('Service Alerts')).toBeNull()
    expect(queryByText('No active service alerts')).toBeNull()
  })

  it('renders alert cards after loading', async () => {
    mockUseAlerts.mockReturnValue({
      alerts: sampleAlerts,
      loading: false,
      error: null,
      retry: jest.fn(),
    })
    const { getByText } = render(<MetraAlerts />)
    await waitFor(() => {
      expect(getByText('BNSF Delays')).toBeOnTheScreen()
      expect(getByText('Rock Island Construction')).toBeOnTheScreen()
    })
  })

  it('shows alert count in header', () => {
    mockUseAlerts.mockReturnValue({
      alerts: sampleAlerts,
      loading: false,
      error: null,
      retry: jest.fn(),
    })
    const { getByText } = render(<MetraAlerts />)
    expect(getByText('2 Service Alerts')).toBeOnTheScreen()
  })

  it('shows error state with retry button', () => {
    const retryFn = jest.fn()
    mockUseAlerts.mockReturnValue({
      alerts: [],
      loading: false,
      error: 'Alert API error: 401',
      retry: retryFn,
    })
    const { getByText } = render(<MetraAlerts />)
    expect(getByText('Failed to load alerts: Alert API error: 401')).toBeOnTheScreen()
    fireEvent.press(getByText('Retry'))
    expect(retryFn).toHaveBeenCalled()
  })

  it('shows empty state when no alerts', () => {
    mockUseAlerts.mockReturnValue({ alerts: [], loading: false, error: null, retry: jest.fn() })
    const { getByText } = render(<MetraAlerts />)
    expect(getByText('No active service alerts')).toBeOnTheScreen()
  })

  it('renders filter chips including All button', () => {
    mockUseAlerts.mockReturnValue({
      alerts: sampleAlerts,
      loading: false,
      error: null,
      retry: jest.fn(),
    })
    const { getByText, getAllByText } = render(<MetraAlerts />)
    expect(getByText('All')).toBeOnTheScreen()
    expect(getAllByText('BNSF Railway').length).toBeGreaterThanOrEqual(1)
    // "Rock Island" appears as both badge text (routeName) and chip text
    expect(getAllByText('Rock Island').length).toBeGreaterThanOrEqual(2)
  })

  it('filters alerts when a chip is pressed', async () => {
    mockUseAlerts.mockReturnValue({
      alerts: sampleAlerts,
      loading: false,
      error: null,
      retry: jest.fn(),
    })
    const { getAllByText, queryByText } = render(<MetraAlerts />)

    // Press the chip (first "Rock Island" is the chip, second is the badge)
    fireEvent.press(getAllByText('Rock Island')[0])
    expect(queryByText('Rock Island Construction')).toBeOnTheScreen()
    expect(queryByText('BNSF Delays')).toBeNull()
  })

  it('passes routeId to useAlerts', () => {
    mockUseAlerts.mockReturnValue({ alerts: [], loading: false, error: null, retry: jest.fn() })
    render(<MetraAlerts routeId="BNSF" />)
    expect(mockUseAlerts).toHaveBeenCalledWith('metra', 'BNSF')
  })
})
