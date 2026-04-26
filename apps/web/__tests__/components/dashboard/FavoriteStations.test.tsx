import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { mockLine, mockStation } from '../../fixtures'

const mockUseAuth = jest.fn()
jest.mock('@components/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockUseLinesQuery = jest.fn()
const mockUseStationsQuery = jest.fn()
jest.mock('@lib/hooks/useDashboardQueries', () => ({
  useLinesQuery: () => mockUseLinesQuery(),
  useStationsQuery: () => mockUseStationsQuery(),
}))

import FavoriteStations from '@components/dashboard/FavoriteStations'
import { useFavoritesStore } from '@lib/store/favorites'

beforeEach(() => {
  jest.clearAllMocks()
  useFavoritesStore.setState({ favorites: [], hydrated: false })
  localStorage.clear()
  mockUseStationsQuery.mockReturnValue({ data: [mockStation] })
  mockUseLinesQuery.mockReturnValue({ data: [mockLine] })
})

describe('FavoriteStations', () => {
  it('renders nothing when signed out', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    const { container } = render(<FavoriteStations />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when signed in but no favorited stations', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    const { container } = render(<FavoriteStations />)
    expect(container.firstChild).toBeNull()
  })

  it('renders favorited stations linked through their first line', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    useFavoritesStore
      .getState()
      .hydrate([{ type: 'station', id: mockStation.slug, addedAt: '2026-04-25T10:00:00Z' }])
    render(<FavoriteStations />)
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toMatch(/\/cta\/red\//)
    expect(screen.getByText(mockStation.name)).toBeInTheDocument()
  })

  it('skips a favorited station whose detail is not yet in the cache', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    mockUseStationsQuery.mockReturnValue({ data: [] })
    useFavoritesStore
      .getState()
      .hydrate([{ type: 'station', id: 'unknown-slug', addedAt: '2026-04-25T10:00:00Z' }])
    render(<FavoriteStations />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
