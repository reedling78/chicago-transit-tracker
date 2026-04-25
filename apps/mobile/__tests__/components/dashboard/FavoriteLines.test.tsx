import { render } from '@testing-library/react-native'
import { mockLine } from '../../fixtures'

import FavoriteLines from '../../../components/dashboard/FavoriteLines'
import { useFavoritesStore } from '../../../lib/store/favorites'

const mockUseAuth = jest.fn()
jest.mock('../../../lib/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockUseLinesQuery = jest.fn()
jest.mock('../../../lib/useDashboardQueries', () => ({
  useLinesQuery: () => mockUseLinesQuery(),
}))

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

beforeEach(() => {
  jest.clearAllMocks()
  useFavoritesStore.setState({ favorites: [], hydrated: false })
  mockUseLinesQuery.mockReturnValue({ data: [mockLine] })
})

describe('FavoriteLines (mobile)', () => {
  it('shows the sign-in CTA when signed out', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    const { getByText } = render(<FavoriteLines />)
    expect(getByText('Sign in to save your favorite lines.')).toBeTruthy()
  })

  it('shows the empty state when signed in with no favorites', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    const { getByText } = render(<FavoriteLines />)
    expect(getByText('Tap the heart on a line to save it here.')).toBeTruthy()
  })

  it('renders favorited line chips with the line name', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    useFavoritesStore
      .getState()
      .hydrate([{ type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }])
    const { getByText } = render(<FavoriteLines />)
    expect(getByText('Red Line')).toBeTruthy()
  })
})
