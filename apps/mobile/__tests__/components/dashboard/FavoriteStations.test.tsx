import { render } from '@testing-library/react-native'
import { mockLine, mockStation } from '../../fixtures'

import FavoriteStations from '../../../components/dashboard/FavoriteStations'
import { useFavoritesStore } from '../../../lib/store/favorites'

const mockUseAuth = jest.fn()
jest.mock('../../../lib/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockUseLinesQuery = jest.fn()
const mockUseStationsQuery = jest.fn()
jest.mock('../../../lib/useDashboardQueries', () => ({
  useLinesQuery: () => mockUseLinesQuery(),
  useStationsQuery: () => mockUseStationsQuery(),
}))

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

beforeEach(() => {
  jest.clearAllMocks()
  useFavoritesStore.setState({ favorites: [], hydrated: false })
  mockUseStationsQuery.mockReturnValue({ data: [mockStation] })
  mockUseLinesQuery.mockReturnValue({ data: [mockLine] })
})

describe('FavoriteStations (mobile)', () => {
  it('shows the sign-in CTA when signed out', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    const { getByText } = render(<FavoriteStations />)
    expect(getByText('Sign in to save your favorite stations.')).toBeTruthy()
  })

  it('shows the empty state when signed in with no favorites', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    const { getByText } = render(<FavoriteStations />)
    expect(getByText('Tap the heart on a station to save it here.')).toBeTruthy()
  })

  it('renders a row for each favorited station', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    useFavoritesStore
      .getState()
      .hydrate([{ type: 'station', id: mockStation.slug, addedAt: '2026-04-25T10:00:00Z' }])
    const { getByText } = render(<FavoriteStations />)
    expect(getByText(mockStation.name)).toBeTruthy()
  })
})
