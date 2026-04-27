/**
 * @jest-environment jsdom
 */
import { render, screen, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { Favorite } from '@ctt/shared'

const mockUseAuth = jest.fn()
jest.mock('@components/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockUseLinesQuery = jest.fn()
const mockUseStationsQuery = jest.fn()
const mockUseFavoriteTripQuery = jest.fn()
jest.mock('@lib/hooks/useDashboardQueries', () => ({
  useLinesQuery: () => mockUseLinesQuery(),
  useStationsQuery: () => mockUseStationsQuery(),
  useFavoriteTripQuery: (id: string | null) => mockUseFavoriteTripQuery(id),
}))

const mockReorder = jest.fn()
jest.mock('@lib/hooks/useReorderFavorites', () => ({
  useReorderFavorites: () => ({ reorder: mockReorder, isReordering: false }),
}))

jest.mock('@lib/hooks/useToggleFavorite', () => ({
  useToggleFavorite: () => ({
    isFavorited: true,
    toggle: jest.fn(),
    isToggling: false,
    needsAuth: false,
  }),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

import DashboardGrid from '@components/dashboard/DashboardGrid'
import { useFavoritesStore } from '@lib/store/favorites'
import { mockLine, mockMetraLine, mockStation, mockMetraStation } from '../../fixtures'

function getCapturedDragEnd():
  | ((event: { active: { id: string }; over: { id: string } | null }) => void)
  | undefined {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const lib = require('@dnd-kit/core') as {
    __captured: {
      lastOnDragEnd?: (event: { active: { id: string }; over: { id: string } | null }) => void
    }
  }
  return lib.__captured.lastOnDragEnd
}

const allFavorites: Favorite[] = [
  { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' },
  { type: 'station', id: 'clark-lake', addedAt: '2026-04-25T11:00:00Z' },
  { type: 'train', id: 'bnsf_1234', addedAt: '2026-04-25T12:00:00Z' },
]

beforeEach(() => {
  jest.clearAllMocks()
  useFavoritesStore.setState({ favorites: [], hydrated: false, pendingWrites: 0 })
  localStorage.clear()
  mockUseLinesQuery.mockReturnValue({ data: [mockLine, mockMetraLine] })
  mockUseStationsQuery.mockReturnValue({ data: [mockStation, mockMetraStation] })
  mockUseFavoriteTripQuery.mockReturnValue({
    data: { trainNumber: '1234', line: 'BNSF', headsign: 'Chicago' },
  })
})

describe('DashboardGrid', () => {
  it('renders nothing while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true })
    const { container } = render(<DashboardGrid />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when there is no user (handled by DashboardHeader)', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    const { container } = render(<DashboardGrid />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when signed-in with no favorites (handled by DashboardHeader)', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    const { container } = render(<DashboardGrid />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders one card per favorite, mixed types', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    useFavoritesStore.getState().hydrate(allFavorites)
    render(<DashboardGrid />)
    expect(screen.getByText('Red Line')).toBeInTheDocument()
    expect(screen.getByText('Clark/Lake')).toBeInTheDocument()
    expect(screen.getByText('Train 1234')).toBeInTheDocument()
  })

  it('shows the long-press / menu hint when favorites are present', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    useFavoritesStore.getState().hydrate(allFavorites)
    render(<DashboardGrid />)
    expect(screen.getByText(/drag a card to reorder/i)).toBeInTheDocument()
  })

  it('calls reorder() with the new order on drag-end', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    useFavoritesStore.getState().hydrate(allFavorites)
    render(<DashboardGrid />)
    const onDragEnd = getCapturedDragEnd()
    expect(onDragEnd).toBeDefined()
    // Move the train (index 2) above the line (index 0)
    act(() => onDragEnd?.({ active: { id: 'train:bnsf_1234' }, over: { id: 'line:red' } }))
    expect(mockReorder).toHaveBeenCalledTimes(1)
    expect(mockReorder.mock.calls[0][0].map((f: Favorite) => f.id)).toEqual([
      'bnsf_1234',
      'red',
      'clark-lake',
    ])
  })

  it('does not call reorder when drop target is the same as drag source', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    useFavoritesStore.getState().hydrate(allFavorites)
    render(<DashboardGrid />)
    const onDragEnd = getCapturedDragEnd()
    act(() => onDragEnd?.({ active: { id: 'line:red' }, over: { id: 'line:red' } }))
    expect(mockReorder).not.toHaveBeenCalled()
  })
})
