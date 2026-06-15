import { createRef } from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { MetraTripDetail, StationSchedule } from '@ctt/shared'
import DashboardItemMenuSheet, {
  type DashboardItemMenuSheetHandle,
} from '../../../components/dashboard/DashboardItemMenuSheet'
import {
  mockLine,
  mockStation,
  mockMetraLine,
  mockMetraStation,
  mockMetraHubStation,
} from '../../fixtures'
import { useDashboardStore } from '../../../lib/store/dashboard'

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockToggle = jest.fn()
jest.mock('../../../lib/useToggleDashboardItem', () => ({
  useToggleDashboardItem: () => ({
    isOnDashboard: true,
    toggle: mockToggle,
    isToggling: false,
    needsAuth: false,
  }),
}))

const mockUpdate = jest.fn()
jest.mock('../../../lib/useUpdateDashboardItemSettings', () => ({
  useUpdateDashboardItemSettings: () => ({ update: mockUpdate, isUpdating: false }),
}))

const mockScheduleQuery = jest.fn()
const mockFavoriteTripQuery = jest.fn()
jest.mock('../../../lib/useDashboardQueries', () => ({
  useStationScheduleQuery: (slug: string | null) => mockScheduleQuery(slug),
  useDashboardItemTripQuery: (id: string | null) => mockFavoriteTripQuery(id),
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
      sequence: 10,
      stationName: 'Chicago Union Station',
      slug: 'union-station-metra',
      arrival: '7:05 AM',
      departure: '7:05 AM',
    },
  ],
}

const ctaSchedule: StationSchedule = {
  directions: [
    { headsign: 'Loop', line: 'Red', weekday: [], saturday: [], sunday: [] },
    { headsign: "O'Hare", line: 'Blue', weekday: [], saturday: [], sunday: [] },
  ],
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  jest.clearAllMocks()
  useDashboardStore.setState({ items: [], hydrated: false, pendingWrites: 0 })
  mockScheduleQuery.mockReset()
  mockScheduleQuery.mockReturnValue({ data: null, isLoading: false, dataUpdatedAt: 0 })
  mockFavoriteTripQuery.mockReset()
  mockFavoriteTripQuery.mockReturnValue({ data: null })
})

describe('DashboardItemMenuSheet', () => {
  it('does not render menu items until open() is called', () => {
    const ref = createRef<DashboardItemMenuSheetHandle>()
    const { queryByText } = render(
      <DashboardItemMenuSheet ref={ref} lines={[mockLine]} stations={[mockStation]} />,
      { wrapper },
    )
    expect(queryByText('Open details')).toBeNull()
    expect(queryByText('Remove from dashboard')).toBeNull()
  })

  it('shows menu items + line title after open() (line favorite)', () => {
    const ref = createRef<DashboardItemMenuSheetHandle>()
    const { getByText, queryByText } = render(
      <DashboardItemMenuSheet ref={ref} lines={[mockLine]} stations={[mockStation]} />,
      { wrapper },
    )
    const fav: Favorite = { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }
    act(() => ref.current?.open(fav))
    expect(getByText('Red Line')).toBeTruthy()
    expect(getByText('Open details')).toBeTruthy()
    expect(queryByText('Mute alerts')).toBeNull()
    expect(queryByText('Share')).toBeNull()
    expect(getByText('Remove from dashboard')).toBeTruthy()
    // Line favorites should NOT show View / Show toggle rows.
    expect(queryByText('VIEW')).toBeNull()
    expect(queryByText('SHOW')).toBeNull()
  })

  it('Open details navigates to the favorite route', () => {
    const ref = createRef<DashboardItemMenuSheetHandle>()
    const { getByText } = render(
      <DashboardItemMenuSheet ref={ref} lines={[mockLine]} stations={[mockStation]} />,
      { wrapper },
    )
    act(() => ref.current?.open({ type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }))
    fireEvent.press(getByText('Open details'))
    expect(mockPush).toHaveBeenCalledWith('/cta/red')
  })

  it('Remove from dashboard invokes toggle()', () => {
    const ref = createRef<DashboardItemMenuSheetHandle>()
    const { getByText } = render(
      <DashboardItemMenuSheet ref={ref} lines={[mockLine]} stations={[mockStation]} />,
      { wrapper },
    )
    act(() => ref.current?.open({ type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }))
    fireEvent.press(getByText('Remove from dashboard'))
    expect(mockToggle).toHaveBeenCalled()
  })

  describe('train favorites', () => {
    it('shows "{origin} to {destination}" title and "{line} #{number}" subtitle from the trip', () => {
      mockFavoriteTripQuery.mockReturnValue({ data: trip })
      const ref = createRef<DashboardItemMenuSheetHandle>()
      const { getByText } = render(
        <DashboardItemMenuSheet ref={ref} lines={[mockMetraLine]} stations={[mockMetraStation]} />,
        { wrapper },
      )
      act(() =>
        ref.current?.open({ type: 'train', id: 'md-w_2222', addedAt: '2026-04-25T10:00:00Z' }),
      )
      expect(getByText('Big Timber to Union Station')).toBeTruthy()
      expect(getByText('MD-W #2222')).toBeTruthy()
    })

    it('falls back to "Train {number}" when trip data is unavailable', () => {
      mockFavoriteTripQuery.mockReturnValue({ data: null })
      const ref = createRef<DashboardItemMenuSheetHandle>()
      const { getByText } = render(
        <DashboardItemMenuSheet ref={ref} lines={[mockMetraLine]} stations={[mockMetraStation]} />,
        { wrapper },
      )
      act(() =>
        ref.current?.open({ type: 'train', id: 'md-w_2222', addedAt: '2026-04-25T10:00:00Z' }),
      )
      expect(getByText('Train 2222')).toBeTruthy()
    })

    it('shows Set departure / destination items when onSetTrainStop is provided', () => {
      const ref = createRef<DashboardItemMenuSheetHandle>()
      const onSetTrainStop = jest.fn()
      const { getByText } = render(
        <DashboardItemMenuSheet
          ref={ref}
          lines={[mockMetraLine]}
          stations={[mockMetraStation]}
          onSetTrainStop={onSetTrainStop}
        />,
        { wrapper },
      )
      act(() =>
        ref.current?.open({
          type: 'train',
          id: 'md-w_2222',
          addedAt: '2026-04-25T10:00:00Z',
        }),
      )
      fireEvent.press(getByText('Set departure station…'))
      expect(onSetTrainStop).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'train', id: 'md-w_2222' }),
        'origin',
      )
    })

    it('hides Set departure / destination items when onSetTrainStop is not provided', () => {
      const ref = createRef<DashboardItemMenuSheetHandle>()
      const { queryByText } = render(
        <DashboardItemMenuSheet ref={ref} lines={[mockMetraLine]} stations={[mockMetraStation]} />,
        { wrapper },
      )
      act(() =>
        ref.current?.open({
          type: 'train',
          id: 'md-w_2222',
          addedAt: '2026-04-25T10:00:00Z',
        }),
      )
      expect(queryByText('Set departure station…')).toBeNull()
      expect(queryByText('Set destination station…')).toBeNull()
    })
  })

  it('falls back to favorite id when line/station data is missing', () => {
    const ref = createRef<DashboardItemMenuSheetHandle>()
    const { getByText } = render(
      <DashboardItemMenuSheet ref={ref} lines={undefined} stations={undefined} />,
      { wrapper },
    )
    act(() => ref.current?.open({ type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }))
    expect(getByText('red')).toBeTruthy()
  })

  describe('station favorites', () => {
    it('renders View toggle that updates density', () => {
      const ref = createRef<DashboardItemMenuSheetHandle>()
      const { getByLabelText } = render(
        <DashboardItemMenuSheet ref={ref} lines={[mockLine]} stations={[mockStation]} />,
        { wrapper },
      )
      act(() =>
        ref.current?.open({
          type: 'station',
          id: 'clark-lake',
          addedAt: '2026-04-25T10:00:00Z',
        }),
      )
      fireEvent.press(getByLabelText('View: Compact'))
      expect(mockUpdate).toHaveBeenCalledWith({ density: 'compact' })
    })

    it('reflects the live store selection so radios update while the sheet is open', () => {
      // Store says compact; the opened favorite snapshot has no density. The
      // open sheet must follow the store, not the stale snapshot.
      useDashboardStore.setState({
        items: [
          {
            type: 'station',
            id: 'clark-lake',
            addedAt: '2026-04-25T10:00:00Z',
            density: 'compact',
          },
        ],
        hydrated: true,
        pendingWrites: 0,
      })
      const ref = createRef<DashboardItemMenuSheetHandle>()
      const { getByLabelText } = render(
        <DashboardItemMenuSheet ref={ref} lines={[mockLine]} stations={[mockStation]} />,
        { wrapper },
      )
      act(() =>
        ref.current?.open({
          type: 'station',
          id: 'clark-lake',
          addedAt: '2026-04-25T10:00:00Z',
        }),
      )
      expect(getByLabelText('View: Compact').props.accessibilityState.selected).toBe(true)
      expect(getByLabelText('View: Expanded').props.accessibilityState.selected).toBe(false)
    })

    it('renders Inbound/Outbound toggles for Metra stations', () => {
      const ref = createRef<DashboardItemMenuSheetHandle>()
      const { getByLabelText } = render(
        <DashboardItemMenuSheet ref={ref} lines={[mockMetraLine]} stations={[mockMetraStation]} />,
        { wrapper },
      )
      act(() =>
        ref.current?.open({
          type: 'station',
          id: 'aurora',
          addedAt: '2026-04-25T10:00:00Z',
        }),
      )
      fireEvent.press(getByLabelText('Show: Inbound'))
      expect(mockUpdate).toHaveBeenCalledWith({ directionFilter: 'inbound' })
    })

    it('renders one chip per CTA headsign from the schedule', () => {
      mockScheduleQuery.mockReturnValue({
        data: ctaSchedule,
        isLoading: false,
        dataUpdatedAt: 0,
      })
      const ref = createRef<DashboardItemMenuSheetHandle>()
      const { getByLabelText } = render(
        <DashboardItemMenuSheet ref={ref} lines={[mockLine]} stations={[mockStation]} />,
        { wrapper },
      )
      act(() =>
        ref.current?.open({
          type: 'station',
          id: 'clark-lake',
          addedAt: '2026-04-25T10:00:00Z',
        }),
      )
      fireEvent.press(getByLabelText('Show: Loop'))
      expect(mockUpdate).toHaveBeenCalledWith({ directionFilter: 'Loop' })
    })

    it('renders a Line row with one chip per line for a multi-line Metra station', () => {
      const ref = createRef<DashboardItemMenuSheetHandle>()
      const { getByLabelText } = render(
        <DashboardItemMenuSheet
          ref={ref}
          lines={[mockMetraLine]}
          stations={[mockMetraHubStation]}
        />,
        { wrapper },
      )
      act(() =>
        ref.current?.open({
          type: 'station',
          id: 'union-station-metra',
          addedAt: '2026-04-25T10:00:00Z',
        }),
      )
      expect(getByLabelText('Line: All')).toBeTruthy()
      expect(getByLabelText('Line: BNSF')).toBeTruthy()
      expect(getByLabelText('Line: MD-W')).toBeTruthy()
      expect(getByLabelText('Line: UP-N')).toBeTruthy()
      fireEvent.press(getByLabelText('Line: MD-W'))
      expect(mockUpdate).toHaveBeenCalledWith({ lineFilter: 'MD-W' })
    })

    it('does not render a Line row for a single-line Metra station', () => {
      const ref = createRef<DashboardItemMenuSheetHandle>()
      const { queryByLabelText } = render(
        <DashboardItemMenuSheet ref={ref} lines={[mockMetraLine]} stations={[mockMetraStation]} />,
        { wrapper },
      )
      act(() =>
        ref.current?.open({ type: 'station', id: 'aurora', addedAt: '2026-04-25T10:00:00Z' }),
      )
      expect(queryByLabelText('Line: All')).toBeNull()
    })

    it('does not render a Line row for a CTA station', () => {
      mockScheduleQuery.mockReturnValue({ data: ctaSchedule, isLoading: false, dataUpdatedAt: 0 })
      const ref = createRef<DashboardItemMenuSheetHandle>()
      const { queryByLabelText } = render(
        <DashboardItemMenuSheet ref={ref} lines={[mockLine]} stations={[mockStation]} />,
        { wrapper },
      )
      act(() =>
        ref.current?.open({ type: 'station', id: 'clark-lake', addedAt: '2026-04-25T10:00:00Z' }),
      )
      expect(queryByLabelText('Line: All')).toBeNull()
    })

    it('does not fetch a schedule for Metra stations', () => {
      const ref = createRef<DashboardItemMenuSheetHandle>()
      render(
        <DashboardItemMenuSheet ref={ref} lines={[mockMetraLine]} stations={[mockMetraStation]} />,
        { wrapper },
      )
      act(() =>
        ref.current?.open({
          type: 'station',
          id: 'aurora',
          addedAt: '2026-04-25T10:00:00Z',
        }),
      )
      // Most recent call should pass null because Metra doesn't need headsign chips.
      expect(mockScheduleQuery).toHaveBeenLastCalledWith(null)
    })
  })
})
