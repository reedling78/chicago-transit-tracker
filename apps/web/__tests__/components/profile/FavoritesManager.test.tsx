import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockClearAll = jest.fn()
const mockUseClearAllFavorites = jest.fn(() => ({
  clearAll: mockClearAll,
  isClearing: false,
  needsAuth: false,
}))

jest.mock('../../../app/lib/hooks/useClearAllFavorites', () => ({
  useClearAllFavorites: () => mockUseClearAllFavorites(),
}))

jest.mock('../../../app/lib/hooks/useDashboardQueries', () => ({
  useLinesQuery: () => ({ data: [] }),
  useStationsQuery: () => ({ data: [] }),
}))

jest.mock('../../../app/components/profile/FavoritesSection', () => {
  return function MockFavoritesSection({
    title,
    favorites,
  }: {
    title: string
    favorites: Array<{ id: string }>
  }) {
    if (favorites.length === 0) return null
    return (
      <div data-testid={`section-${title}`}>
        {title} ({favorites.length})
      </div>
    )
  }
})

import FavoritesManager from '../../../app/components/profile/FavoritesManager'
import { useFavoritesStore } from '../../../app/lib/store/favorites'

beforeEach(() => {
  jest.clearAllMocks()
  useFavoritesStore.setState({ favorites: [], hydrated: false, pendingWrites: 0 })
})

describe('FavoritesManager', () => {
  it('renders an empty state and disables Clear all when there are no favorites', () => {
    render(<FavoritesManager />)
    expect(screen.getByText(/No favorites yet/i)).toBeInTheDocument()
    const clearButton = screen.getByRole('button', { name: /clear all/i })
    expect(clearButton).toBeDisabled()
  })

  it('groups favorites into Lines, Stations, and Trains sections', () => {
    useFavoritesStore.setState({
      favorites: [
        { type: 'line', id: 'red', addedAt: '2026-01-01T00:00:00Z' },
        { type: 'line', id: 'blue', addedAt: '2026-01-02T00:00:00Z' },
        { type: 'station', id: 'clark-lake', addedAt: '2026-01-03T00:00:00Z' },
        { type: 'train', id: 'bnsf_1200', addedAt: '2026-01-04T00:00:00Z' },
      ],
    })
    render(<FavoritesManager />)
    expect(screen.getByTestId('section-Lines')).toHaveTextContent('Lines (2)')
    expect(screen.getByTestId('section-Stations')).toHaveTextContent('Stations (1)')
    expect(screen.getByTestId('section-Trains')).toHaveTextContent('Trains (1)')
  })

  it('hides empty sections', () => {
    useFavoritesStore.setState({
      favorites: [{ type: 'line', id: 'red', addedAt: '2026-01-01T00:00:00Z' }],
    })
    render(<FavoritesManager />)
    expect(screen.getByTestId('section-Lines')).toBeInTheDocument()
    expect(screen.queryByTestId('section-Stations')).not.toBeInTheDocument()
    expect(screen.queryByTestId('section-Trains')).not.toBeInTheDocument()
  })

  it('confirms before calling clearAll', () => {
    useFavoritesStore.setState({
      favorites: [{ type: 'line', id: 'red', addedAt: '2026-01-01T00:00:00Z' }],
    })
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
    render(<FavoritesManager />)
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }))
    expect(confirmSpy).toHaveBeenCalled()
    expect(mockClearAll).toHaveBeenCalledTimes(1)
    confirmSpy.mockRestore()
  })

  it('does not call clearAll when the user cancels the confirm', () => {
    useFavoritesStore.setState({
      favorites: [{ type: 'line', id: 'red', addedAt: '2026-01-01T00:00:00Z' }],
    })
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false)
    render(<FavoritesManager />)
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }))
    expect(mockClearAll).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })
})
