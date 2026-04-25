import { render, fireEvent } from '@testing-library/react-native'

import DashboardHeader from '../../../components/dashboard/DashboardHeader'

const mockUseAuth = jest.fn()
jest.mock('../../../lib/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

beforeEach(() => {
  jest.clearAllMocks()
})

describe('DashboardHeader (mobile)', () => {
  it('shows the site name and Sign in when signed out', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: false })
    const { getByText } = render(<DashboardHeader />)
    expect(getByText('Chicago Transit Tracker')).toBeTruthy()
    expect(getByText('Sign in')).toBeTruthy()
  })

  it('routes to /auth when Sign in is tapped', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: false })
    const { getByLabelText } = render(<DashboardHeader />)
    fireEvent.press(getByLabelText('Sign in'))
    expect(mockPush).toHaveBeenCalledWith('/auth')
  })

  it('shows the welcome greeting and Profile button when signed in', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'u1' },
      profile: { displayName: 'Jane Smith' },
      loading: false,
    })
    const { getByText } = render(<DashboardHeader />)
    expect(getByText('Welcome back, Jane')).toBeTruthy()
    expect(getByText('Profile')).toBeTruthy()
  })

  it('routes to /profile when Profile is tapped', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'u1' },
      profile: { displayName: 'Jane Smith' },
      loading: false,
    })
    const { getByLabelText } = render(<DashboardHeader />)
    fireEvent.press(getByLabelText('Profile'))
    expect(mockPush).toHaveBeenCalledWith('/profile')
  })
})
