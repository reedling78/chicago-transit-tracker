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
  useStationScheduleQuery: () => ({ data: null, isLoading: false, dataUpdatedAt: 0 }),
  useStationTripsQuery: () => ({ data: null, isLoading: false, dataUpdatedAt: 0 }),
}))

jest.mock('../../../lib/useUpdateFavoriteSettings', () => ({
  useUpdateFavoriteSettings: () => ({ update: jest.fn(), isUpdating: false }),
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

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RN = require('react-native')
const headerEl = <RN.Text testID="grid-header">HEADER</RN.Text>
const footerEl = <RN.Text testID="grid-footer">FOOTER</RN.Text>

describe('DashboardGrid', () => {
  it('renders header + footer (no list) while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true })
    const { getByTestId, queryByTestId } = render(
      <DashboardGrid header={headerEl} footer={footerEl} />,
      { wrapper },
    )
    expect(getByTestId('grid-header')).toBeTruthy()
    expect(getByTestId('grid-footer')).toBeTruthy()
    expect(queryByTestId('draggable-flatlist-stub')).toBeNull()
  })

  it('renders header + footer (no list) when there is no user', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    const { getByTestId, queryByTestId } = render(
      <DashboardGrid header={headerEl} footer={footerEl} />,
      { wrapper },
    )
    expect(getByTestId('grid-header')).toBeTruthy()
    expect(getByTestId('grid-footer')).toBeTruthy()
    expect(queryByTestId('draggable-flatlist-stub')).toBeNull()
  })

  it('renders header + footer (no list) when signed in with no favorites', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    const { getByTestId, queryByTestId } = render(
      <DashboardGrid header={headerEl} footer={footerEl} />,
      { wrapper },
    )
    expect(getByTestId('grid-header')).toBeTruthy()
    expect(getByTestId('grid-footer')).toBeTruthy()
    expect(queryByTestId('draggable-flatlist-stub')).toBeNull()
  })

  it('shows the long-press / menu hint footer when favorites are present', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    useFavoritesStore.getState().hydrate(allFavorites)
    const { getByText } = render(<DashboardGrid />, { wrapper })
    expect(getByText(/long-press a card/i)).toBeTruthy()
  })

  it('does not render a "Favorites" section header in any state', () => {
    // Header was removed because the dashboard route already serves as the
    // favorites surface — a "Favorites" heading was redundant.
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    useFavoritesStore.getState().hydrate(allFavorites)
    const populated = render(<DashboardGrid />, { wrapper })
    expect(populated.queryByText('Favorites')).toBeNull()
    populated.unmount()

    useFavoritesStore.setState({ favorites: [], hydrated: false, pendingWrites: 0 })
    const empty = render(<DashboardGrid />, { wrapper })
    expect(empty.queryByText('Favorites')).toBeNull()
    empty.unmount()

    mockUseAuth.mockReturnValue({ user: null, loading: false })
    const signedOut = render(<DashboardGrid />, { wrapper })
    expect(signedOut.queryByText('Favorites')).toBeNull()
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
