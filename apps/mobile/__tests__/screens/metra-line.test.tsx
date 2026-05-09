import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react-native'
import { mockMetraLine, mockMetraStation } from '../fixtures'
import { useLine, useLineStations } from '../../lib/hooks'
import MetraLineDetailScreen from '../../app/metra/[line]'

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
  const StackScreen = (props: { options?: { headerRight?: () => ReactNode } }) =>
    props.options?.headerRight ? props.options.headerRight() : null
  StackScreen.displayName = 'StackScreen'
  ;(Stack as unknown as { Screen: typeof StackScreen }).Screen = StackScreen
  return {
    Link: ({ children }: { children: ReactNode }) => children,
    useLocalSearchParams: () => ({ line: 'bnsf' }),
    useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
    Stack,
  }
})

jest.mock('../../lib/hooks', () => ({
  useLine: jest.fn(),
  useLineStations: jest.fn(),
}))

const mockUseLine = useLine as jest.MockedFunction<typeof useLine>
const mockUseLineStations = useLineStations as jest.MockedFunction<typeof useLineStations>

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

  it('renders the station timeline body when data is loaded', () => {
    mockUseLine.mockReturnValue({ line: mockMetraLine, loading: false })
    mockUseLineStations.mockReturnValue({ stations: [mockMetraStation], loading: false })
    render(<MetraLineDetailScreen />)
    // "Aurora" appears in both the termini subtitle and the station name
    expect(screen.getAllByText('Aurora').length).toBeGreaterThanOrEqual(1)
  })

  it('places the favorite button in the PageHeader title row', () => {
    mockUseLine.mockReturnValue({ line: mockMetraLine, loading: false })
    mockUseLineStations.mockReturnValue({ stations: [mockMetraStation], loading: false })
    render(<MetraLineDetailScreen />)
    const stub = screen.getByTestId('favorite-button-stub')
    expect(stub).toBeOnTheScreen()
    expect(stub.props.children).toBe('line:bnsf')
  })

  it('renders the global Footer at the end of the scroll content', () => {
    mockUseLine.mockReturnValue({ line: mockMetraLine, loading: false })
    mockUseLineStations.mockReturnValue({ stations: [mockMetraStation], loading: false })
    render(<MetraLineDetailScreen />)
    expect(screen.getByTestId('footer')).toBeOnTheScreen()
  })
})
