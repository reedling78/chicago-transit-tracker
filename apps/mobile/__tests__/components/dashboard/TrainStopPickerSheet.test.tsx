import { createRef } from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { MetraTripDetail } from '@ctt/shared'
import TrainStopPickerSheet, {
  type TrainStopPickerSheetHandle,
} from '../../../components/dashboard/TrainStopPickerSheet'
import { useFavoritesStore } from '../../../lib/store/favorites'

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}))

const mockFavoriteTripQuery = jest.fn()
jest.mock('../../../lib/useDashboardQueries', () => ({
  useFavoriteTripQuery: (id: string | null) => mockFavoriteTripQuery(id),
}))

const mockUpdate = jest.fn()
jest.mock('../../../lib/useUpdateFavoriteSettings', () => ({
  useUpdateFavoriteSettings: () => ({ update: mockUpdate, isUpdating: false }),
}))

const trip: MetraTripDetail = {
  tripId: 'md-w_2222',
  trainNumber: '2222',
  headsign: 'Chicago Union Station',
  line: 'MD-W',
  lineSlug: 'md-w',
  lineName: 'Milwaukee District West',
  serviceType: 'weekday',
  directionId: 1,
  isExpress: false,
  stops: [
    {
      sequence: 1,
      stationName: 'Big Timber',
      slug: 'big-timber',
      arrival: '6:00 AM',
      departure: '6:00 AM',
    },
    {
      sequence: 5,
      stationName: 'Schaumburg',
      slug: 'schaumburg',
      arrival: '6:25 AM',
      departure: '6:25 AM',
    },
    {
      sequence: 10,
      stationName: 'Chicago Union Station',
      slug: 'union-station-metra',
      arrival: '7:05 AM',
      departure: '7:05 AM',
    },
  ],
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  jest.clearAllMocks()
  useFavoritesStore.setState({ favorites: [], hydrated: false, pendingWrites: 0 })
  mockFavoriteTripQuery.mockReset()
  mockFavoriteTripQuery.mockReturnValue({ data: trip })
})

describe('TrainStopPickerSheet', () => {
  it('renders eligible stops inside the bottom-sheet scroll view and persists a selection', () => {
    const ref = createRef<TrainStopPickerSheetHandle>()
    const { getByText } = render(<TrainStopPickerSheet ref={ref} />, { wrapper })
    act(() =>
      ref.current?.open({
        favorite: { type: 'train', id: 'md-w_2222', addedAt: '2026-04-25T10:00:00Z' },
        mode: 'origin',
      }),
    )
    expect(getByText('Set departure station')).toBeTruthy()
    expect(getByText('Big Timber')).toBeTruthy()
    expect(getByText('Schaumburg')).toBeTruthy()
    fireEvent.press(getByText('Schaumburg'))
    expect(mockUpdate).toHaveBeenCalledWith({ trainOriginStopSlug: 'schaumburg' })
  })
})
