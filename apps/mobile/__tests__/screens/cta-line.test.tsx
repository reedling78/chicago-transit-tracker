import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react-native'
import { mockLine, mockStation } from '../fixtures'
import { useLine, useLineStations } from '../../lib/hooks'
import CtaLineDetailScreen from '../../app/cta/[line]'

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
    Rect: () => null,
    G: ({ children }: { children?: React.ReactNode }) => children ?? null,
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
    useLocalSearchParams: () => ({ line: 'red' }),
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

describe('CtaLineDetailScreen', () => {
  it('shows loading state while the line is loading', () => {
    mockUseLine.mockReturnValue({ line: null, loading: true })
    mockUseLineStations.mockReturnValue({ stations: [], loading: true })
    render(<CtaLineDetailScreen />)
    expect(screen.queryByText('Red Line')).toBeNull()
  })

  it('renders the line name and termini in the PageHeader', () => {
    mockUseLine.mockReturnValue({ line: mockLine, loading: false })
    mockUseLineStations.mockReturnValue({ stations: [mockStation], loading: false })
    render(<CtaLineDetailScreen />)
    expect(screen.getByText('Red Line')).toBeOnTheScreen()
    expect(screen.getByText('Howard ↔ 95th/Dan Ryan')).toBeOnTheScreen()
  })

  it('renders the station timeline body when data is loaded', () => {
    mockUseLine.mockReturnValue({ line: mockLine, loading: false })
    mockUseLineStations.mockReturnValue({ stations: [mockStation], loading: false })
    render(<CtaLineDetailScreen />)
    expect(screen.getByText('Clark/Lake')).toBeOnTheScreen()
  })

  it('places the favorite button in the PageHeader title row', () => {
    mockUseLine.mockReturnValue({ line: mockLine, loading: false })
    mockUseLineStations.mockReturnValue({ stations: [mockStation], loading: false })
    render(<CtaLineDetailScreen />)
    // FavoriteButton is globally stubbed in jest.setup.ts; verify the stub appears
    // with the correct type/id, which proves the component is wired into the header.
    const stub = screen.getByTestId('favorite-button-stub')
    expect(stub).toBeOnTheScreen()
    expect(stub.props.children).toBe('line:red')
  })

  it('does not render the Footer', () => {
    mockUseLine.mockReturnValue({ line: mockLine, loading: false })
    mockUseLineStations.mockReturnValue({ stations: [mockStation], loading: false })
    render(<CtaLineDetailScreen />)
    expect(screen.queryByTestId('footer')).toBeNull()
  })
})
