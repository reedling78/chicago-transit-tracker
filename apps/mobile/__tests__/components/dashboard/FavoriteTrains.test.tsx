import { render } from '@testing-library/react-native'

import FavoriteTrains from '../../../components/dashboard/FavoriteTrains'
import { useFavoritesStore } from '../../../lib/store/favorites'

const mockUseAuth = jest.fn()
jest.mock('../../../lib/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockUseFavoriteTripQuery = jest.fn()
jest.mock('../../../lib/useDashboardQueries', () => ({
  useFavoriteTripQuery: (tripId: string | null) => mockUseFavoriteTripQuery(tripId),
}))

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

beforeEach(() => {
  jest.clearAllMocks()
  useFavoritesStore.setState({ favorites: [], hydrated: false })
})

describe('FavoriteTrains (mobile)', () => {
  it('shows the sign-in CTA when signed out', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    const { getByText } = render(<FavoriteTrains />)
    expect(getByText('Sign in to save your favorite trains.')).toBeTruthy()
  })

  it('shows the empty state when signed in with no favorites', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    const { getByText } = render(<FavoriteTrains />)
    expect(getByText('Tap the heart on a train page to save it here.')).toBeTruthy()
  })

  it('renders a row per favorited train using its trip data', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    mockUseFavoriteTripQuery.mockReturnValue({
      data: {
        trainNumber: '1234',
        line: 'BNSF',
        lineName: 'BNSF',
        headsign: 'Chicago',
        serviceType: 'weekday',
      },
    })
    useFavoritesStore
      .getState()
      .hydrate([{ type: 'train', id: 'bnsf_1234', addedAt: '2026-04-25T10:00:00Z' }])
    const { getByText } = render(<FavoriteTrains />)
    expect(getByText('Train 1234')).toBeTruthy()
    expect(getByText('To Chicago')).toBeTruthy()
  })

  it('shows a placeholder when trip data is missing', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    mockUseFavoriteTripQuery.mockReturnValue({ data: null })
    useFavoritesStore
      .getState()
      .hydrate([{ type: 'train', id: 'bnsf_9999', addedAt: '2026-04-25T10:00:00Z' }])
    const { getByText } = render(<FavoriteTrains />)
    expect(getByText('Train 9999')).toBeTruthy()
    expect(getByText('Trip not currently scheduled')).toBeTruthy()
  })
})
