import { render, fireEvent } from '@testing-library/react-native'
import ProfileScreen from '../../app/profile'
import { useAuth } from '../../lib/AuthContext'
import { signOut } from '../../lib/auth'

const mockReplace = jest.fn()
const capturedScreenOptions: Record<string, unknown>[] = []

jest.mock('expo-router', () => {
  const StackScreen = (props: { options?: Record<string, unknown> }) => {
    capturedScreenOptions.push(props.options ?? {})
    return null
  }
  StackScreen.displayName = 'StackScreen'
  const Stack = { Screen: StackScreen }
  return {
    Stack,
    useRouter: () => ({ replace: mockReplace }),
  }
})

jest.mock('../../lib/useNavHeaderInset', () => ({
  useNavHeaderInset: () => 64,
}))

jest.mock('../../lib/AuthContext', () => ({
  useAuth: jest.fn(),
}))

jest.mock('../../lib/auth', () => ({
  signOut: jest.fn(),
}))

jest.mock('../../components/profile/FavoritesManager', () => {
  const { View } = jest.requireActual('react-native')
  return function MockFavoritesManager() {
    return <View testID="favorites-manager" />
  }
})

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>

beforeEach(() => {
  jest.clearAllMocks()
  capturedScreenOptions.length = 0
})

describe('ProfileScreen', () => {
  it('configures the traditional app header with the site title', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      loading: false,
    } as ReturnType<typeof useAuth>)
    render(<ProfileScreen />)
    expect(capturedScreenOptions).toHaveLength(1)
    const opts = capturedScreenOptions[0]
    expect(opts.headerTransparent).toBe(true)
    expect(opts.headerTitle).toBe('Chicago Transit Tracker')
    expect(opts.headerTitleAlign).toBe('left')
    expect(opts.headerLeft).toBeUndefined()
  })

  it('shows a loading state while auth is resolving', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      loading: true,
    } as ReturnType<typeof useAuth>)
    const { getByText } = render(<ProfileScreen />)
    expect(getByText('Loading...')).toBeOnTheScreen()
  })

  it('shows a sign-in CTA when there is no profile', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      loading: false,
    } as ReturnType<typeof useAuth>)
    const { getByText, queryByTestId } = render(<ProfileScreen />)
    expect(getByText('Sign in to view your profile.')).toBeOnTheScreen()
    fireEvent.press(getByText('Sign In'))
    expect(mockReplace).toHaveBeenCalledWith('/auth')
    expect(queryByTestId('favorites-manager')).toBeNull()
  })

  it('renders profile fields and the favorites manager when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'u1' },
      profile: {
        uid: 'u1',
        email: 'reed@example.com',
        displayName: 'Reed',
        provider: 'google',
        createdAt: '2026-04-25T00:00:00.000Z',
        updatedAt: '2026-04-25T00:00:00.000Z',
      },
      loading: false,
    } as ReturnType<typeof useAuth>)
    const { getByText, getByTestId } = render(<ProfileScreen />)
    expect(getByText('reed@example.com')).toBeOnTheScreen()
    expect(getByText('Google')).toBeOnTheScreen()
    expect(getByTestId('favorites-manager')).toBeOnTheScreen()
  })

  it('does not render the display name field', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'u1' },
      profile: {
        uid: 'u1',
        email: 'reed@example.com',
        displayName: 'Reed',
        provider: 'google',
        createdAt: '2026-04-25T00:00:00.000Z',
        updatedAt: '2026-04-25T00:00:00.000Z',
      },
      loading: false,
    } as ReturnType<typeof useAuth>)
    const { queryByText } = render(<ProfileScreen />)
    expect(queryByText('Display Name')).toBeNull()
    expect(queryByText('Reed')).toBeNull()
  })

  it('renders a three-state theme toggle on the authed profile', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'u1' },
      profile: {
        uid: 'u1',
        email: 'reed@example.com',
        displayName: 'Reed',
        provider: 'google',
        createdAt: '2026-04-25T00:00:00.000Z',
        updatedAt: '2026-04-25T00:00:00.000Z',
      },
      loading: false,
    } as ReturnType<typeof useAuth>)
    const { getByTestId, getByLabelText } = render(<ProfileScreen />)
    expect(getByTestId('theme-toggle')).toBeOnTheScreen()
    expect(getByLabelText('Theme: System')).toBeOnTheScreen()
    expect(getByLabelText('Theme: Light')).toBeOnTheScreen()
    expect(getByLabelText('Theme: Dark')).toBeOnTheScreen()
  })

  it('renders the theme toggle on the signed-out profile too', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      loading: false,
    } as ReturnType<typeof useAuth>)
    const { getByTestId } = render(<ProfileScreen />)
    expect(getByTestId('theme-toggle')).toBeOnTheScreen()
  })

  it('renders the global Footer on the signed-out profile', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      loading: false,
    } as ReturnType<typeof useAuth>)
    const { getByTestId } = render(<ProfileScreen />)
    expect(getByTestId('footer')).toBeOnTheScreen()
  })

  it('renders the global Footer on the authed profile', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'u1' },
      profile: {
        uid: 'u1',
        email: 'reed@example.com',
        displayName: 'Reed',
        provider: 'google',
        createdAt: '2026-04-25T00:00:00.000Z',
        updatedAt: '2026-04-25T00:00:00.000Z',
      },
      loading: false,
    } as ReturnType<typeof useAuth>)
    const { getByTestId } = render(<ProfileScreen />)
    expect(getByTestId('footer')).toBeOnTheScreen()
  })

  it('signs out and routes to the home screen', async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'u1' },
      profile: {
        uid: 'u1',
        email: 'reed@example.com',
        displayName: 'Reed',
        provider: 'google',
        createdAt: '2026-04-25T00:00:00.000Z',
        updatedAt: '2026-04-25T00:00:00.000Z',
      },
      loading: false,
    } as ReturnType<typeof useAuth>)
    mockSignOut.mockResolvedValue(undefined)
    const { getByText } = render(<ProfileScreen />)
    fireEvent.press(getByText('Sign Out'))
    await Promise.resolve()
    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(mockReplace).toHaveBeenCalledWith('/')
  })
})
