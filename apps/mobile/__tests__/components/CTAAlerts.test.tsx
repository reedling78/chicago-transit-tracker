import { render, waitFor, fireEvent } from '@testing-library/react-native'
import CTAAlerts from '../../components/CTAAlerts'
import { useAlerts } from '../../lib/hooks'
import { mockCtaAlert } from '../fixtures'
import type { NormalizedAlert } from '@ctt/shared'

jest.mock('../../lib/hooks', () => ({
  useAlerts: jest.fn(),
}))
const mockUseAlerts = useAlerts as jest.MockedFunction<typeof useAlerts>

const sampleAlerts: NormalizedAlert[] = [
  mockCtaAlert,
  {
    ...mockCtaAlert,
    id: '2',
    headline: 'Blue Line Track Work',
    description: 'Shuttle buses running',
    routes: [{ routeId: 'Blue', routeName: 'Blue Line', color: '#00a1de', textColor: '#ffffff' }],
  },
]

afterEach(() => {
  jest.clearAllMocks()
})

describe('CTAAlerts', () => {
  it('shows loading indicator initially', () => {
    mockUseAlerts.mockReturnValue({ alerts: [], loading: true, error: null, retry: jest.fn() })
    const { queryByText } = render(<CTAAlerts />)
    // Should not show content while loading
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
    const { getByText } = render(<CTAAlerts />)
    await waitFor(() => {
      expect(getByText('Red Line Signal Work')).toBeOnTheScreen()
      expect(getByText('Blue Line Track Work')).toBeOnTheScreen()
    })
  })

  it('shows alert count in header', () => {
    mockUseAlerts.mockReturnValue({
      alerts: sampleAlerts,
      loading: false,
      error: null,
      retry: jest.fn(),
    })
    const { getByText } = render(<CTAAlerts />)
    expect(getByText('2 Service Alerts')).toBeOnTheScreen()
  })

  it('shows error state with retry button', () => {
    const retryFn = jest.fn()
    mockUseAlerts.mockReturnValue({
      alerts: [],
      loading: false,
      error: 'Alert API error: 500',
      retry: retryFn,
    })
    const { getByText } = render(<CTAAlerts />)
    expect(getByText('Failed to load alerts: Alert API error: 500')).toBeOnTheScreen()
    fireEvent.press(getByText('Retry'))
    expect(retryFn).toHaveBeenCalled()
  })

  it('shows empty state when no alerts', () => {
    mockUseAlerts.mockReturnValue({ alerts: [], loading: false, error: null, retry: jest.fn() })
    const { getByText } = render(<CTAAlerts />)
    expect(getByText('No active service alerts')).toBeOnTheScreen()
  })

  it('renders filter chips including All button', () => {
    mockUseAlerts.mockReturnValue({
      alerts: sampleAlerts,
      loading: false,
      error: null,
      retry: jest.fn(),
    })
    const { getByText, getAllByText } = render(<CTAAlerts />)
    expect(getByText('All')).toBeOnTheScreen()
    // "Red Line" appears as both a badge and a chip
    expect(getAllByText('Red Line').length).toBeGreaterThanOrEqual(2)
    expect(getAllByText('Blue Line').length).toBeGreaterThanOrEqual(2)
  })

  it('filters alerts when a chip is pressed', async () => {
    mockUseAlerts.mockReturnValue({
      alerts: sampleAlerts,
      loading: false,
      error: null,
      retry: jest.fn(),
    })
    const { getAllByText, queryByText } = render(<CTAAlerts />)

    // Press the first "Red Line" text (the chip)
    fireEvent.press(getAllByText('Red Line')[0])
    expect(queryByText('Red Line Signal Work')).toBeOnTheScreen()
    expect(queryByText('Blue Line Track Work')).toBeNull()
  })

  it('passes routeId to useAlerts', () => {
    mockUseAlerts.mockReturnValue({ alerts: [], loading: false, error: null, retry: jest.fn() })
    render(<CTAAlerts routeId="Red" />)
    expect(mockUseAlerts).toHaveBeenCalledWith('cta', 'Red')
  })
})
