import { render } from '@testing-library/react-native'
import { Platform } from 'react-native'
import AuthScreen from '../../app/(app)/auth'

const mockSearchParams: { mode?: string } = {}
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
  useLocalSearchParams: () => mockSearchParams,
}))

jest.mock('../../lib/useNavHeaderInset', () => ({
  useNavHeaderInset: () => 64,
}))

jest.mock('../../lib/auth', () => ({
  signInWithEmail: jest.fn(),
  signUpWithEmail: jest.fn(),
  resetPassword: jest.fn(),
  signInWithApple: jest.fn(),
  signInWithGoogleCredential: jest.fn(),
  googleAuthConfig: { webClientId: '', iosClientId: '', androidClientId: '' },
}))

jest.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: () => [null, null, jest.fn()],
}))

describe('AuthScreen', () => {
  it('renders the sign-in form by default', () => {
    const { getAllByText, getByPlaceholderText } = render(<AuthScreen />)
    // Sign In appears as both the title and the submit button
    expect(getAllByText('Sign In').length).toBeGreaterThanOrEqual(1)
    expect(getByPlaceholderText('you@example.com')).toBeOnTheScreen()
    expect(getByPlaceholderText('At least 6 characters')).toBeOnTheScreen()
  })

  it('renders the Apple sign-in button on iOS', () => {
    Platform.OS = 'ios'
    const { getByText } = render(<AuthScreen />)
    expect(getByText('Sign in with Apple')).toBeOnTheScreen()
  })

  it('renders the Apple sign-in button on Android (web bridge flow)', () => {
    Platform.OS = 'android'
    const { getByText } = render(<AuthScreen />)
    expect(getByText('Sign in with Apple')).toBeOnTheScreen()
    Platform.OS = 'ios'
  })

  it('always renders the Google sign-in button and no Facebook button', () => {
    const { getByText, queryByText } = render(<AuthScreen />)
    expect(getByText('Sign in with Google')).toBeOnTheScreen()
    expect(queryByText('Sign in with Facebook')).toBeNull()
  })

  it('opens directly in sign-up mode when mode=signUp is passed', () => {
    mockSearchParams.mode = 'signUp'
    const { getAllByText } = render(<AuthScreen />)
    expect(getAllByText('Create Account').length).toBeGreaterThanOrEqual(1)
    delete mockSearchParams.mode
  })
})
