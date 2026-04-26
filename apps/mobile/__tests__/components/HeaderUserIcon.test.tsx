import { render, fireEvent } from '@testing-library/react-native'

import HeaderUserIcon from '../../components/HeaderUserIcon'

const mockUseAuth = jest.fn()
jest.mock('../../lib/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('@expo/vector-icons/Ionicons', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return {
    __esModule: true,
    default: ({ name }: { name: string }) => <Text>{name}</Text>,
  }
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('HeaderUserIcon (mobile)', () => {
  it('renders nothing while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true })
    const { queryByLabelText } = render(<HeaderUserIcon />)
    expect(queryByLabelText('Sign in')).toBeNull()
    expect(queryByLabelText('Profile')).toBeNull()
  })

  it('shows the outline person icon labeled Sign in when signed out and routes to /auth on press', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    const { getByLabelText, getByText } = render(<HeaderUserIcon />)
    const button = getByLabelText('Sign in')
    expect(button).toBeTruthy()
    expect(getByText('person-circle-outline')).toBeTruthy()
    fireEvent.press(button)
    expect(mockPush).toHaveBeenCalledWith('/auth')
  })

  it('shows the filled person icon labeled Profile when signed in and routes to /profile on press', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    const { getByLabelText, getByText } = render(<HeaderUserIcon />)
    const button = getByLabelText('Profile')
    expect(button).toBeTruthy()
    expect(getByText('person-circle')).toBeTruthy()
    fireEvent.press(button)
    expect(mockPush).toHaveBeenCalledWith('/profile')
  })
})
