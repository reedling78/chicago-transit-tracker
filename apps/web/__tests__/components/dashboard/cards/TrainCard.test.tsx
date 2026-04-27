/**
 * @jest-environment jsdom
 */
import { render, fireEvent, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { Favorite, Line, MetraTripDetail } from '@ctt/shared'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockUseFavoriteTripQuery = jest.fn()
jest.mock('@lib/hooks/useDashboardQueries', () => ({
  useFavoriteTripQuery: (tripId: string | null) => mockUseFavoriteTripQuery(tripId),
  useStationScheduleQuery: () => ({ data: null, isLoading: false, dataUpdatedAt: 0 }),
  useStationTripsQuery: () => ({ data: null, isLoading: false, dataUpdatedAt: 0 }),
}))

jest.mock('@lib/hooks/useToggleFavorite', () => ({
  useToggleFavorite: () => ({
    isFavorited: true,
    toggle: jest.fn(),
    isToggling: false,
    needsAuth: false,
  }),
}))

const mockUpdate = jest.fn()
jest.mock('@lib/hooks/useUpdateFavoriteSettings', () => ({
  useUpdateFavoriteSettings: () => ({ update: mockUpdate, isUpdating: false }),
}))

const mockUseLive = jest.fn()
jest.mock('@lib/hooks/useMetraTripLiveStatus', () => ({
  useMetraTripLiveStatus: (...args: unknown[]) => mockUseLive(...args),
}))

import TrainCard from '@components/dashboard/cards/TrainCard'

const fav: Favorite = { type: 'train', id: 'md-w_2222', addedAt: '2026-04-25T10:00:00Z' }

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
      sequence: 8,
      stationName: 'Western Avenue',
      slug: 'western-avenue-metra',
      arrival: '6:50 AM',
      departure: '6:50 AM',
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

const lines: Line[] = [
  {
    id: 'md-w',
    name: 'Milwaukee District West',
    shortName: 'MD-W',
    slug: 'md-w',
    service: 'metra',
    color: '#C8872A',
    textColor: '#fff',
    termini: ['Big Timber', 'Chicago Union Station'],
    stationCount: 23,
    routeMiles: 0,
    operatesOvernight: false,
    peakFrequencyMins: null,
    offPeakFrequencyMins: null,
    firstTrainApprox: null,
    lastTrainApprox: null,
    type: 'commuter_rail',
    description: '',
    ctaRouteId: null,
    metraLineCode: 'MD-W',
    downtownTerminal: 'Chicago Union Station',
    operator: 'Metra',
    countiesServed: [],
    photoUrl: null,
    scheduleUrl: null,
  },
]

beforeEach(() => {
  mockPush.mockClear()
  mockUseFavoriteTripQuery.mockReset()
  mockUpdate.mockReset()
  mockUseLive.mockReset()
  mockUseLive.mockReturnValue(null)
})

describe('TrainCard', () => {
  it('renders an "origin to destination" header from the trip stops', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: trip })
    render(
      <ul>
        <TrainCard favorite={fav} lines={lines} stations={undefined} />
      </ul>,
    )
    expect(screen.getByText('Big Timber to Chicago Union Station')).toBeInTheDocument()
  })

  it('uses overrides from the favorite to render a custom segment', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: trip })
    render(
      <ul>
        <TrainCard
          favorite={{
            ...fav,
            trainOriginStopSlug: 'schaumburg',
            trainDestinationStopSlug: 'western-avenue-metra',
          }}
          lines={lines}
          stations={undefined}
        />
      </ul>,
    )
    expect(screen.getByText('Schaumburg to Western Avenue')).toBeInTheDocument()
  })

  it('shows the right-meta as #trainNumber and the descriptive pill row', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: trip })
    render(
      <ul>
        <TrainCard favorite={fav} lines={lines} stations={undefined} />
      </ul>,
    )
    expect(screen.getByText('#2222')).toBeInTheDocument()
    expect(screen.getByText('Metra')).toBeInTheDocument()
    expect(screen.getByText('MD-W')).toBeInTheDocument()
    expect(screen.getByText('Weekday')).toBeInTheDocument()
    expect(screen.queryByText('Express')).not.toBeInTheDocument()
  })

  it('renders an Express pill when the trip is flagged as express', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: { ...trip, isExpress: true } })
    render(
      <ul>
        <TrainCard favorite={fav} lines={lines} stations={undefined} />
      </ul>,
    )
    expect(screen.getByText('Express')).toBeInTheDocument()
  })

  it('falls back to "Train ${trainNumber}" + placeholder subtitle when trip data is missing', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: null })
    render(
      <ul>
        <TrainCard
          favorite={{ type: 'train', id: 'bnsf_9999', addedAt: '2026-04-25T10:00:00Z' }}
          lines={undefined}
          stations={undefined}
        />
      </ul>,
    )
    expect(screen.getByText('Train 9999')).toBeInTheDocument()
    expect(screen.getByText('Trip not currently scheduled')).toBeInTheDocument()
  })

  it('renders a link to /metra/{line}/train/{trainNumber}', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: null })
    const { container } = render(
      <ul>
        <TrainCard favorite={fav} lines={undefined} stations={undefined} />
      </ul>,
    )
    expect(container.querySelector('a[href="/metra/md-w/train/2222"]')).not.toBeNull()
  })

  it('applies a left-border accent in the line color when the line is known', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: trip })
    const { container } = render(
      <ul>
        <TrainCard favorite={fav} lines={lines} stations={undefined} />
      </ul>,
    )
    const li = container.querySelector('li')!
    expect(li.getAttribute('style') ?? '').toMatch(/#C8872A|rgb\(200, ?135, ?42\)/i)
  })

  it('opens the menu and exposes train-stop picker entries when stops are loaded', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: trip })
    render(
      <ul>
        <TrainCard favorite={fav} lines={lines} stations={undefined} />
      </ul>,
    )
    fireEvent.click(screen.getByLabelText('Open menu for Big Timber to Chicago Union Station'))
    expect(screen.getByText('Set departure station…')).toBeInTheDocument()
    expect(screen.getByText('Set destination station…')).toBeInTheDocument()
  })

  it('hides the train-stop picker entries when trip has no stops', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: { ...trip, stops: [] } })
    render(
      <ul>
        <TrainCard favorite={fav} lines={lines} stations={undefined} />
      </ul>,
    )
    fireEvent.click(screen.getByLabelText(/Open menu/))
    expect(screen.queryByText('Set departure station…')).not.toBeInTheDocument()
  })

  it('persists a destination override when the picker selects a stop', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: trip })
    render(
      <ul>
        <TrainCard favorite={fav} lines={lines} stations={undefined} />
      </ul>,
    )
    fireEvent.click(screen.getByLabelText(/Open menu/))
    fireEvent.click(screen.getByText('Set destination station…'))
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Western Avenue/ }))
    expect(mockUpdate).toHaveBeenCalledWith({
      trainDestinationStopSlug: 'western-avenue-metra',
    })
  })

  it('forbids choosing a destination at or before the current origin', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: trip })
    render(
      <ul>
        <TrainCard
          favorite={{ ...fav, trainOriginStopSlug: 'western-avenue-metra' }}
          lines={lines}
          stations={undefined}
        />
      </ul>,
    )
    fireEvent.click(screen.getByLabelText(/Open menu/))
    fireEvent.click(screen.getByText('Set destination station…'))
    expect(screen.queryByRole('menuitemradio', { name: /Big Timber/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitemradio', { name: /Schaumburg/ })).not.toBeInTheDocument()
    expect(screen.getByRole('menuitemradio', { name: /Chicago Union Station/ })).toBeInTheDocument()
  })

  it('renders the mini live-status panel when realtime data is available', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: trip })
    mockUseLive.mockReturnValue({
      phase: 'active',
      isNoData: false,
      status: { tone: 'ontime', label: 'On time' },
      currentDerived: undefined,
      firstStop: trip.stops[0],
      lastStop: trip.stops[trip.stops.length - 1],
      vehiclePosition: null,
      error: null,
      nowMs: Date.now(),
      fetchedAt: Date.now(),
    })
    render(
      <ul>
        <TrainCard favorite={fav} lines={lines} stations={undefined} />
      </ul>,
    )
    expect(screen.getByText('On time')).toBeInTheDocument()
  })

  it('hides the mini live-status panel when phase is nodata', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: trip })
    mockUseLive.mockReturnValue({
      phase: 'nodata',
      isNoData: true,
      status: null,
      currentDerived: undefined,
      firstStop: trip.stops[0],
      lastStop: trip.stops[trip.stops.length - 1],
      vehiclePosition: null,
      error: null,
      nowMs: Date.now(),
      fetchedAt: 0,
    })
    render(
      <ul>
        <TrainCard favorite={fav} lines={lines} stations={undefined} />
      </ul>,
    )
    expect(screen.queryByText('On time')).not.toBeInTheDocument()
  })
})
