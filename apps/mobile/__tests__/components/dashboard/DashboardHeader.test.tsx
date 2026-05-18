import { render, fireEvent } from '@testing-library/react-native'
import type { Favorite } from '@ctt/shared'

import DashboardHeader from '../../../components/dashboard/DashboardHeader'
import { useFavoritesStore } from '../../../lib/store/favorites'

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
  useFavoritesStore.setState({ favorites: [], hydrated: false, pendingWrites: 0 })
})

describe('DashboardHeader (mobile)', () => {
  it('renders nothing while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: true })
    const { toJSON } = render(<DashboardHeader />)
    expect(toJSON()).toBeNull()
  })

  describe('unauthed', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: null, profile: null, loading: false })
    })

    it('shows tagline and both CTA buttons but not a duplicate site title', () => {
      const { getByText, queryByText } = render(<DashboardHeader />)
      expect(queryByText('Chicago Transit Tracker')).toBeNull()
      expect(getByText(/Real-time schedules, routes/)).toBeTruthy()
      expect(getByText(/Sign up to customize your dashboard/)).toBeTruthy()
      expect(getByText('Sign up')).toBeTruthy()
      expect(getByText('Log in')).toBeTruthy()
    })

    it('does not render the profile icon button in the unauthed hero', () => {
      const { queryByLabelText } = render(<DashboardHeader />)
      expect(queryByLabelText('Profile')).toBeNull()
    })

    it('routes to /auth?mode=signUp when Sign up is pressed', () => {
      const { getByLabelText } = render(<DashboardHeader />)
      fireEvent.press(getByLabelText('Sign up'))
      expect(mockPush).toHaveBeenCalledWith('/auth?mode=signUp')
    })

    it('routes to /auth when Log in is pressed', () => {
      const { getByLabelText } = render(<DashboardHeader />)
      fireEvent.press(getByLabelText('Log in'))
      expect(mockPush).toHaveBeenCalledWith('/auth')
    })
  })

  describe('authed with no favorites', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, profile: null, loading: false })
    })

    it('shows the generic heading when no displayName is available', () => {
      const { getByText } = render(<DashboardHeader />)
      expect(getByText('Welcome back')).toBeTruthy()
    })

    it('uses the displayName when available', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'u1' },
        profile: { displayName: 'Reed Rizzo' },
        loading: false,
      })
      const { getByText } = render(<DashboardHeader />)
      expect(getByText('Welcome back, Reed')).toBeTruthy()
    })

    it('shows the empty card with quick links to /cta and /metra', () => {
      const { getByText, getByLabelText } = render(<DashboardHeader />)
      expect(getByText('No favorites yet')).toBeTruthy()
      fireEvent.press(getByLabelText('Browse CTA'))
      expect(mockPush).toHaveBeenCalledWith('/cta')
      fireEvent.press(getByLabelText('Browse Metra'))
      expect(mockPush).toHaveBeenCalledWith('/metra')
    })

    it('does not render the unauthed marketing copy', () => {
      const { queryByText } = render(<DashboardHeader />)
      expect(queryByText(/Real-time schedules, routes/)).toBeNull()
      expect(queryByText('Sign up')).toBeNull()
      expect(queryByText('Log in')).toBeNull()
    })

    it('does not render the profile icon (it now lives in the navigator header)', () => {
      const { queryByLabelText } = render(<DashboardHeader />)
      expect(queryByLabelText('Profile')).toBeNull()
    })
  })

  describe('authed with favorites', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, profile: null, loading: false })
      const favs: Favorite[] = [{ type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }]
      useFavoritesStore.getState().hydrate(favs)
    })

    it('shows the heading but not the profile icon or the empty card', () => {
      const { getByText, queryByLabelText, queryByText } = render(<DashboardHeader />)
      expect(getByText('Welcome back')).toBeTruthy()
      expect(queryByLabelText('Profile')).toBeNull()
      expect(queryByText('No favorites yet')).toBeNull()
    })
  })
})
