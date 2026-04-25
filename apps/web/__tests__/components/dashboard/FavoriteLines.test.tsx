import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { mockLine, mockMetraLine } from '../../fixtures'

const mockUseAuth = jest.fn()
jest.mock('@components/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockUseLinesQuery = jest.fn()
jest.mock('@lib/hooks/useDashboardQueries', () => ({
  useLinesQuery: () => mockUseLinesQuery(),
}))

import FavoriteLines from '@components/dashboard/FavoriteLines'
import { useFavoritesStore } from '@lib/store/favorites'

beforeEach(() => {
  jest.clearAllMocks()
  useFavoritesStore.setState({ favorites: [], hydrated: false })
  localStorage.clear()
  mockUseLinesQuery.mockReturnValue({ data: [mockLine, mockMetraLine] })
})

describe('FavoriteLines', () => {
  it('shows the sign-in CTA when signed out', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    render(<FavoriteLines />)
    expect(screen.getByText('Sign in to save your favorite lines.')).toBeInTheDocument()
  })

  it('shows the empty state when signed in with no favorites', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    render(<FavoriteLines />)
    expect(screen.getByText('Tap the heart on a line page to save it here.')).toBeInTheDocument()
  })

  it('renders favorited lines as links to their detail pages', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    useFavoritesStore
      .getState()
      .hydrate([{ type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }])
    render(<FavoriteLines />)
    const link = screen.getByRole('link', { name: 'Red Line line' })
    expect(link).toHaveAttribute('href', '/cta/red')
  })

  it('falls back to the slug when the line is not in the cache', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    mockUseLinesQuery.mockReturnValue({ data: [] })
    useFavoritesStore
      .getState()
      .hydrate([{ type: 'line', id: 'unknown-line', addedAt: '2026-04-25T10:00:00Z' }])
    render(<FavoriteLines />)
    expect(screen.getByText('unknown-line')).toBeInTheDocument()
  })

  it('renders nothing while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true })
    const { container } = render(<FavoriteLines />)
    expect(container.firstChild).toBeNull()
  })
})
