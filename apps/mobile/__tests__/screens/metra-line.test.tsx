import type { ReactNode } from 'react'
import { render, screen, fireEvent } from '@testing-library/react-native'
import { mockMetraLine, mockMetraStation } from '../fixtures'
import { useLine, useLineStations, useMetraLineTrips } from '../../lib/hooks'
import MetraLineDetailScreen from '../../app/(app)/metra/[line]'

jest.mock('expo-linear-gradient', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native')
  return {
    LinearGradient: (props: Record<string, unknown>) => <View {...props} />,
  }
})

jest.mock('../../lib/useNavHeaderInset', () => ({
  useNavHeaderInset: () => 64,
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

jest.mock('expo-router', () => {
  const Stack = () => null
  Stack.displayName = 'Stack'
  const StackScreen = (props: {
    options?: {
      headerRight?: () => ReactNode
      unstable_headerRightItems?: () => { element: ReactNode }[]
    }
  }) => {
    const items = props.options?.unstable_headerRightItems?.()
    if (items && items.length > 0) return items[0].element as React.ReactElement
    return props.options?.headerRight ? (props.options.headerRight() as React.ReactElement) : null
  }
  StackScreen.displayName = 'StackScreen'
  ;(Stack as unknown as { Screen: typeof StackScreen }).Screen = StackScreen
  return {
    Link: ({ children }: { children: ReactNode }) => children,
    useLocalSearchParams: () => ({ line: 'bnsf' }),
    useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
    useNavigation: () => ({ dispatch: jest.fn() }),
    Stack,
  }
})

jest.mock('../../lib/hooks', () => ({
  useLine: jest.fn(),
  useLineStations: jest.fn(),
  useMetraLineTrips: jest.fn(() => ({ trips: [], loading: false })),
}))

jest.mock('../../lib/useMetraFeed', () => ({
  useMetraFeed: jest.fn(() => ({ data: null, error: null, fetchedAt: null, loading: true })),
}))

const mockUseLine = useLine as jest.MockedFunction<typeof useLine>
const mockUseLineStations = useLineStations as jest.MockedFunction<typeof useLineStations>
const mockUseMetraLineTrips = useMetraLineTrips as jest.MockedFunction<typeof useMetraLineTrips>

beforeEach(() => {
  mockUseMetraLineTrips.mockReturnValue({ trips: [], loading: false })
})

describe('MetraLineDetailScreen', () => {
  it('shows loading state while the line is loading', () => {
    mockUseLine.mockReturnValue({ line: null, loading: true })
    mockUseLineStations.mockReturnValue({ stations: [], loading: true })
    render(<MetraLineDetailScreen />)
    expect(screen.queryByText('BNSF Railway')).toBeNull()
  })

  it('renders the line name and termini in the PageHeader', () => {
    mockUseLine.mockReturnValue({ line: mockMetraLine, loading: false })
    mockUseLineStations.mockReturnValue({ stations: [mockMetraStation], loading: false })
    render(<MetraLineDetailScreen />)
    expect(screen.getByText('BNSF Railway')).toBeOnTheScreen()
    expect(screen.getByText('Union Station ↔ Aurora')).toBeOnTheScreen()
  })

  it('renders the Live and Stations tabs', () => {
    mockUseLine.mockReturnValue({ line: mockMetraLine, loading: false })
    mockUseLineStations.mockReturnValue({ stations: [mockMetraStation], loading: false })
    render(<MetraLineDetailScreen />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(2)
  })

  it('renders the menu button in the header right', () => {
    mockUseLine.mockReturnValue({ line: mockMetraLine, loading: false })
    mockUseLineStations.mockReturnValue({ stations: [mockMetraStation], loading: false })
    render(<MetraLineDetailScreen />)
    const menuButton = screen.getByLabelText('Open menu')
    expect(menuButton).toBeOnTheScreen()
  })

  it('renders the DashboardAddButton on the hero for the line', () => {
    mockUseLine.mockReturnValue({ line: mockMetraLine, loading: false })
    mockUseLineStations.mockReturnValue({ stations: [mockMetraStation], loading: false })
    render(<MetraLineDetailScreen />)
    const stub = screen.getByTestId('dashboard-add-button-stub')
    expect(stub.props.children).toBe('line:bnsf')
  })

  it('shows the Live tab (current service) by default and not the station list', () => {
    mockUseLine.mockReturnValue({ line: mockMetraLine, loading: false })
    mockUseLineStations.mockReturnValue({ stations: [mockMetraStation], loading: false })
    render(<MetraLineDetailScreen />)
    expect(screen.getByTestId('current-service-list')).toBeOnTheScreen()
    expect(screen.getByText('Current service')).toBeOnTheScreen()
    // the station timeline is not mounted while the Live tab is active
    expect(screen.queryByLabelText('Aurora')).toBeNull()
  })

  it('switches to the Stations tab to show the station timeline and unmounts Live', () => {
    mockUseLine.mockReturnValue({ line: mockMetraLine, loading: false })
    mockUseLineStations.mockReturnValue({ stations: [mockMetraStation], loading: false })
    render(<MetraLineDetailScreen />)
    fireEvent.press(screen.getByRole('tab', { name: 'Stations' }))
    expect(screen.getByLabelText('Aurora')).toBeOnTheScreen()
    expect(screen.queryByTestId('current-service-list')).toBeNull()
  })

  it('switches back to the Live tab from Stations', () => {
    mockUseLine.mockReturnValue({ line: mockMetraLine, loading: false })
    mockUseLineStations.mockReturnValue({ stations: [mockMetraStation], loading: false })
    render(<MetraLineDetailScreen />)
    fireEvent.press(screen.getByRole('tab', { name: 'Stations' }))
    fireEvent.press(screen.getByRole('tab', { name: 'Live' }))
    expect(screen.getByTestId('current-service-list')).toBeOnTheScreen()
    expect(screen.queryByLabelText('Aurora')).toBeNull()
  })

  it('does not render the Footer', () => {
    mockUseLine.mockReturnValue({ line: mockMetraLine, loading: false })
    mockUseLineStations.mockReturnValue({ stations: [mockMetraStation], loading: false })
    render(<MetraLineDetailScreen />)
    expect(screen.queryByTestId('footer')).toBeNull()
  })
})
