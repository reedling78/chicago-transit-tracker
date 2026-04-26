import { render, fireEvent } from '@testing-library/react-native'
import ProfileScreen from '../../app/profile'
import { useAuth } from '../../lib/AuthContext'
import { signOut } from '../../lib/auth'

const mockReplace = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}))

jest.mock('../../lib/useNavHeaderInset', () => ({
  useNavHeaderInset: () => 64,
}))

jest.mock('../../lib/AuthContext', () => ({
  useAuth: jest.fn(),
}))

jest.mock('../../lib/auth', () => ({
  signOut: jest.fn(),
}))

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>

beforeEach(() => {
  jest.clearAllMocks()
})

describe('ProfileScreen', () => {
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
    const { getByText } = render(<ProfileScreen />)
    expect(getByText('Sign in to view your profile.')).toBeOnTheScreen()
    fireEvent.press(getByText('Sign In'))
    expect(mockReplace).toHaveBeenCalledWith('/auth')
  })

  it('renders profile fields when a profile is present', () => {
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
    const { getByText } = render(<ProfileScreen />)
    expect(getByText('reed@example.com')).toBeOnTheScreen()
    expect(getByText('Reed')).toBeOnTheScreen()
    expect(getByText('Google')).toBeOnTheScreen()
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
    // Wait a tick for the async handler to flush
    await Promise.resolve()
    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(mockReplace).toHaveBeenCalledWith('/')
  })
})
