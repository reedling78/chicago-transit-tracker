import { render, fireEvent } from '@testing-library/react-native'
import ProfilePanel from '../../../components/profile/ProfilePanel'

const mockUseAuth = jest.fn()
jest.mock('../../../lib/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
const mockReplace = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }))
const mockSignOut = jest.fn()
jest.mock('../../../lib/auth', () => ({ signOut: () => mockSignOut() }))
jest.mock('@expo/vector-icons/Ionicons', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return { __esModule: true, default: ({ name }: { name: string }) => <Text>{name}</Text> }
})

beforeEach(() => jest.clearAllMocks())

describe('ProfilePanel (mobile)', () => {
  it('shows the Sign In CTA when signed out', () => {
    mockUseAuth.mockReturnValue({ profile: null, loading: false })
    const { getByLabelText } = render(<ProfilePanel />)
    fireEvent.press(getByLabelText('Sign In'))
    expect(mockReplace).toHaveBeenCalledWith('/auth')
  })

  it('shows email and Sign Out when signed in', () => {
    mockUseAuth.mockReturnValue({
      profile: { email: 'a@b.com', provider: 'password', createdAt: Date.now() },
      loading: false,
    })
    const { getByText, getByLabelText } = render(<ProfilePanel />)
    expect(getByText('a@b.com')).toBeTruthy()
    fireEvent.press(getByLabelText('Sign Out'))
    expect(mockSignOut).toHaveBeenCalled()
  })
})
