import { render, fireEvent } from '@testing-library/react-native'
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

  it('renders a favorited line as a row card with name, termini, and color chip', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    useFavoritesStore
      .getState()
      .hydrate([{ type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }])
    const { getByText } = render(<FavoriteLines />)
    // Title — the line name
    expect(getByText('Red Line')).toBeTruthy()
    // Subtitle — termini joined
    expect(getByText('Howard — 95th/Dan Ryan')).toBeTruthy()
    // Right chip — short name in line color
    expect(getByText('Red')).toBeTruthy()
  })

  it('routes to the line detail when a row is pressed', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    useFavoritesStore
      .getState()
      .hydrate([{ type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }])
    const { getByLabelText } = render(<FavoriteLines />)
    fireEvent.press(getByLabelText('Red Line'))
    expect(mockPush).toHaveBeenCalledWith('/cta/red')
  })

  it('falls back to the slug as the title and skips the chip when line data is missing', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    mockUseLinesQuery.mockReturnValue({ data: [] }) // no line metadata loaded
    useFavoritesStore
      .getState()
      .hydrate([{ type: 'line', id: 'unknown', addedAt: '2026-04-25T10:00:00Z' }])
    const { getByText, queryByText } = render(<FavoriteLines />)
    expect(getByText('unknown')).toBeTruthy()
    // No "Howard — 95th/Dan Ryan" or other line chip text should appear
    expect(queryByText('Howard — 95th/Dan Ryan')).toBeNull()
  })
})
