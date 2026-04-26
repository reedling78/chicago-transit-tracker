import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockUseAuth = jest.fn()
jest.mock('@components/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockUseFavoriteTripQuery = jest.fn()
jest.mock('@lib/hooks/useDashboardQueries', () => ({
  useFavoriteTripQuery: (tripId: string | null) => mockUseFavoriteTripQuery(tripId),
}))

import FavoriteTrains from '@components/dashboard/FavoriteTrains'
import { useFavoritesStore } from '@lib/store/favorites'

beforeEach(() => {
  jest.clearAllMocks()
  useFavoritesStore.setState({ favorites: [], hydrated: false })
  localStorage.clear()
})

describe('FavoriteTrains', () => {
  it('renders nothing when signed out', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    const { container } = render(<FavoriteTrains />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when signed in but no favorited trains', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    const { container } = render(<FavoriteTrains />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a row per favorited train using its trip data', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    mockUseFavoriteTripQuery.mockImplementation((tripId: string) => ({
      data: {
        trainNumber: tripId.split('_')[1],
        line: 'BNSF',
        lineName: 'BNSF',
        headsign: 'Chicago',
        serviceType: 'weekday',
      },
    }))
    useFavoritesStore
      .getState()
      .hydrate([{ type: 'train', id: 'bnsf_1234', addedAt: '2026-04-25T10:00:00Z' }])
    render(<FavoriteTrains />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/metra/bnsf/train/1234')
    expect(screen.getByText('Train 1234')).toBeInTheDocument()
    expect(screen.getByText('To Chicago')).toBeInTheDocument()
  })

  it('shows a "trip not scheduled" placeholder when trip data is missing', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    mockUseFavoriteTripQuery.mockReturnValue({ data: null })
    useFavoritesStore
      .getState()
      .hydrate([{ type: 'train', id: 'bnsf_9999', addedAt: '2026-04-25T10:00:00Z' }])
    render(<FavoriteTrains />)
    expect(screen.getByText('Train 9999')).toBeInTheDocument()
    expect(screen.getByText('Trip not currently scheduled')).toBeInTheDocument()
  })
})
