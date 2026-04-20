import type { ReactNode } from 'react'
import { render } from '@testing-library/react-native'
import AlertBanner from '../../components/AlertBanner'
import { useAlerts } from '../../lib/hooks'
import { mockCtaAlert, mockMetraAlert } from '../fixtures'

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}))

jest.mock('../../lib/hooks', () => ({
  useAlerts: jest.fn(),
}))
const mockUseAlerts = useAlerts as jest.MockedFunction<typeof useAlerts>

afterEach(() => {
  jest.clearAllMocks()
})

describe('AlertBanner', () => {
  it('shows loading text while fetching', () => {
    mockUseAlerts.mockReturnValue({ alerts: [], loading: true, error: null, retry: jest.fn() })
    const { getByText } = render(<AlertBanner service="cta" href="/cta/alerts" />)
    expect(getByText('Service Alerts')).toBeOnTheScreen()
    expect(getByText('Checking for alerts...')).toBeOnTheScreen()
  })

  it('shows alert count after loading', () => {
    mockUseAlerts.mockReturnValue({
      alerts: [mockCtaAlert, { ...mockCtaAlert, id: '2' }],
      loading: false,
      error: null,
      retry: jest.fn(),
    })
    const { getByText } = render(<AlertBanner service="cta" href="/cta/alerts" />)
    expect(getByText('2 active alerts')).toBeOnTheScreen()
    expect(getByText('2')).toBeOnTheScreen()
  })

  it('shows singular "alert" for count of 1', () => {
    mockUseAlerts.mockReturnValue({
      alerts: [mockMetraAlert],
      loading: false,
      error: null,
      retry: jest.fn(),
    })
    const { getByText } = render(<AlertBanner service="metra" href="/metra/alerts" />)
    expect(getByText('1 active alert')).toBeOnTheScreen()
  })

  it('shows 0 active alerts with no badge when empty', () => {
    mockUseAlerts.mockReturnValue({ alerts: [], loading: false, error: null, retry: jest.fn() })
    const { getByText, queryByTestId } = render(<AlertBanner service="cta" href="/cta/alerts" />)
    expect(getByText('0 active alerts')).toBeOnTheScreen()
    // No red badge shown when count is 0
    expect(queryByTestId('alert-badge')).toBeNull()
  })

  it('passes correct service to useAlerts', () => {
    mockUseAlerts.mockReturnValue({ alerts: [], loading: false, error: null, retry: jest.fn() })
    render(<AlertBanner service="metra" href="/metra/alerts" />)
    expect(mockUseAlerts).toHaveBeenCalledWith('metra')
  })
})
