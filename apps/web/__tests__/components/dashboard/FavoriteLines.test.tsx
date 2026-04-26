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
  it('renders nothing when signed out', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    const { container } = render(<FavoriteLines />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when signed in but no favorited lines', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    const { container } = render(<FavoriteLines />)
    expect(container.firstChild).toBeNull()
  })

  it('renders favorited lines as link cards with the service meta and termini subtitle', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    useFavoritesStore
      .getState()
      .hydrate([{ type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }])
    render(<FavoriteLines />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/cta/red')
    expect(screen.getByText(mockLine.name)).toBeInTheDocument()
    expect(screen.getByText(mockLine.termini.join(' — '))).toBeInTheDocument()
    expect(screen.getByText('CTA')).toBeInTheDocument()
  })

  it('skips a favorited line whose detail is not yet in the cache', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    mockUseLinesQuery.mockReturnValue({ data: [] })
    useFavoritesStore
      .getState()
      .hydrate([{ type: 'line', id: 'unknown-line', addedAt: '2026-04-25T10:00:00Z' }])
    render(<FavoriteLines />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders nothing while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true })
    const { container } = render(<FavoriteLines />)
    expect(container.firstChild).toBeNull()
  })
})
