import { render, fireEvent, act } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Favorite } from '@ctt/shared'

import DashboardGrid from '../../../components/dashboard/DashboardGrid'
import { useFavoritesStore } from '../../../lib/store/favorites'
import { mockLine, mockMetraLine, mockStation, mockMetraStation } from '../../fixtures'

const mockUseAuth = jest.fn()
jest.mock('../../../lib/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockUseLinesQuery = jest.fn()
const mockUseStationsQuery = jest.fn()
const mockUseFavoriteTripQuery = jest.fn()
jest.mock('../../../lib/useDashboardQueries', () => ({
  useLinesQuery: () => mockUseLinesQuery(),
  useStationsQuery: () => mockUseStationsQuery(),
  useFavoriteTripQuery: (id: string | null) => mockUseFavoriteTripQuery(id),
}))

const mockReorder = jest.fn()
jest.mock('../../../lib/useReorderFavorites', () => ({
  useReorderFavorites: () => ({ reorder: mockReorder, isReordering: false }),
}))

const mockToggle = jest.fn()
jest.mock('../../../lib/useToggleFavorite', () => ({
  useToggleFavorite: () => ({
    isFavorited: true,
    toggle: mockToggle,
    isToggling: false,
    needsAuth: false,
  }),
}))

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Reach into the global mock for react-native-draggable-flatlist to drive
// onDragEnd directly without simulating gestures.
function getCapturedDragEnd(): ((params: { data: unknown[] }) => void) | undefined {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const lib = require('react-native-draggable-flatlist') as {
    __captured: { lastOnDragEnd?: (params: { data: unknown[] }) => void }
  }
  return lib.__captured.lastOnDragEnd
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const allFavorites: Favorite[] = [
  { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' },
  { type: 'station', id: 'clark-lake', addedAt: '2026-04-25T11:00:00Z' },
  { type: 'train', id: 'bnsf_1234', addedAt: '2026-04-25T12:00:00Z' },
]

beforeEach(() => {
  jest.clearAllMocks()
  useFavoritesStore.setState({ favorites: [], hydrated: false, pendingWrites: 0 })
  mockUseLinesQuery.mockReturnValue({ data: [mockLine, mockMetraLine] })
  mockUseStationsQuery.mockReturnValue({ data: [mockStation, mockMetraStation] })
  mockUseFavoriteTripQuery.mockReturnValue({
    data: { trainNumber: '1234', line: 'BNSF', headsign: 'Chicago' },
  })
})

describe('DashboardGrid', () => {
  it('renders nothing while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true })
    const { toJSON } = render(<DashboardGrid />, { wrapper })
    expect(toJSON()).toBeNull()
  })

  it('shows the signed-out placeholder when there is no user', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    const { getByText } = render(<DashboardGrid />, { wrapper })
    expect(getByText('Sign in to save favorites')).toBeTruthy()
  })

  it('shows the empty placeholder when signed in with no favorites', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    const { getByText } = render(<DashboardGrid />, { wrapper })
    expect(getByText('No favorites yet')).toBeTruthy()
  })

  it('renders one card per favorite, mixed types', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    useFavoritesStore.getState().hydrate(allFavorites)
    const { getByText } = render(<DashboardGrid />, { wrapper })
    expect(getByText('Red Line')).toBeTruthy()
    expect(getByText('Clark/Lake')).toBeTruthy()
    expect(getByText('Train 1234')).toBeTruthy()
  })

  it('opens the menu sheet when the overflow on a card is tapped', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    useFavoritesStore.getState().hydrate([allFavorites[0]])
    const { getByLabelText, getByText } = render(<DashboardGrid />, { wrapper })
    fireEvent.press(getByLabelText('Open menu for Red Line'))
    expect(getByText('Open details')).toBeTruthy()
    expect(getByText('Remove from favorites')).toBeTruthy()
  })

  it('calls reorder() with the new order on drag-end', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    useFavoritesStore.getState().hydrate(allFavorites)
    render(<DashboardGrid />, { wrapper })
    const onDragEnd = getCapturedDragEnd()
    expect(onDragEnd).toBeDefined()
    const newOrder: Favorite[] = [allFavorites[2], allFavorites[0], allFavorites[1]]
    act(() => onDragEnd?.({ data: newOrder }))
    expect(mockReorder).toHaveBeenCalledWith(newOrder)
  })
})
