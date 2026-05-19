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
    expect(screen.getByText('Big Timber to Union Station')).toBeInTheDocument()
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

  it('folds the agency, line, and train number into a single subheader (no pills)', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: trip })
    render(
      <ul>
        <TrainCard favorite={fav} lines={lines} stations={undefined} />
      </ul>,
    )
    expect(screen.getByText('MD-W #2222')).toBeInTheDocument()
    // The standalone metadata pills are gone entirely.
    expect(screen.queryByText('Weekday')).not.toBeInTheDocument()
    expect(screen.queryByText('Express')).not.toBeInTheDocument()
  })

  it('falls back to "Train ${trainNumber}" + bare #number subheader when trip data is missing', () => {
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
    expect(screen.getByText('#9999')).toBeInTheDocument()
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

  it('does not paint a left-border line-color accent on the card', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: trip })
    const { container } = render(
      <ul>
        <TrainCard favorite={fav} lines={lines} stations={undefined} />
      </ul>,
    )
    const li = container.querySelector('li')!
    expect(li.getAttribute('style') ?? '').not.toMatch(/border-left|#C8872A|rgb\(200, ?135, ?42\)/i)
  })

  it('opens the menu and exposes train-stop picker entries when stops are loaded', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: trip })
    render(
      <ul>
        <TrainCard favorite={fav} lines={lines} stations={undefined} />
      </ul>,
    )
    fireEvent.click(screen.getByLabelText('Open menu for Big Timber to Union Station'))
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
      derivedStops: [],
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

  it('shows a countdown to the origin departure when there is no live data', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-04-25T05:48:00'))
    try {
      mockUseFavoriteTripQuery.mockReturnValue({ data: trip })
      mockUseLive.mockReturnValue(null)
      const { container } = render(
        <ul>
          <TrainCard favorite={fav} lines={lines} stations={undefined} />
        </ul>,
      )
      expect(container.textContent).toContain('Departs in')
      expect(container.textContent).toContain('12 min')
      expect(container.textContent).toContain('6:00 AM')
      expect(container.textContent).toContain('from Big Timber')
    } finally {
      jest.useRealTimers()
    }
  })

  it('shows "Departed … · Next train Monday" on a Saturday for a weekday train', () => {
    jest.useFakeTimers()
    // 2026-04-25 is a Saturday; the next weekday run is Monday.
    jest.setSystemTime(new Date('2026-04-25T09:00:00'))
    try {
      mockUseFavoriteTripQuery.mockReturnValue({ data: trip })
      mockUseLive.mockReturnValue(null)
      const { container } = render(
        <ul>
          <TrainCard favorite={fav} lines={lines} stations={undefined} />
        </ul>,
      )
      expect(container.textContent).toContain('Departed 6:00 AM · Next train Monday')
    } finally {
      jest.useRealTimers()
    }
  })

  it('shows "Next train tomorrow" on a weekday for a weekday train', () => {
    jest.useFakeTimers()
    // 2026-04-21 is a Tuesday; the next weekday run is Wednesday (tomorrow).
    jest.setSystemTime(new Date('2026-04-21T09:00:00'))
    try {
      mockUseFavoriteTripQuery.mockReturnValue({ data: trip })
      mockUseLive.mockReturnValue(null)
      const { container } = render(
        <ul>
          <TrainCard favorite={fav} lines={lines} stations={undefined} />
        </ul>,
      )
      expect(container.textContent).toContain('Departed 6:00 AM · Next train tomorrow')
    } finally {
      jest.useRealTimers()
    }
  })

  it('shows a live indicator in the header and hides the tags when realtime data is available', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: trip })
    mockUseLive.mockReturnValue({
      phase: 'active',
      isNoData: false,
      status: { tone: 'ontime', label: 'On time' },
      currentDerived: undefined,
      derivedStops: [],
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
    expect(screen.getByLabelText('Receiving live data')).toBeInTheDocument()
    expect(screen.getByText('Live')).toBeInTheDocument()
    // The consolidated subheader persists in the live state.
    expect(screen.getByText('MD-W #2222')).toBeInTheDocument()
    expect(screen.queryByText(/Departs in/)).not.toBeInTheDocument()
  })

  it('shows the status bar, next stop on the left, and the destination ETA on the right', () => {
    const now = 1_700_000_000_000
    mockUseFavoriteTripQuery.mockReturnValue({ data: trip })
    mockUseLive.mockReturnValue({
      phase: 'active',
      isNoData: false,
      status: { tone: 'delayed', label: 'Delayed 7 min' },
      currentDerived: {
        stop: trip.stops[1],
        status: 'current',
        delayMinutes: 7,
        skipped: false,
        etaEpoch: Math.floor(now / 1000) + 120,
      },
      derivedStops: [
        {
          stop: trip.stops[3],
          status: 'current',
          delayMinutes: 7,
          skipped: false,
          etaEpoch: Math.floor(now / 1000) + 600,
        },
      ],
      firstStop: trip.stops[0],
      lastStop: trip.stops[trip.stops.length - 1],
      vehiclePosition: null,
      error: null,
      nowMs: now,
      fetchedAt: now,
    })
    render(
      <ul>
        <TrainCard favorite={fav} lines={lines} stations={undefined} />
      </ul>,
    )
    // Status bar
    expect(screen.getByText('Delayed 7 min')).toBeInTheDocument()
    // Next stop (left)
    expect(screen.getByText('Next stop')).toBeInTheDocument()
    expect(screen.getByText('Schaumburg')).toBeInTheDocument()
    // Destination ETA (right)
    expect(screen.getByText(/^Arrives /)).toBeInTheDocument()
    expect(screen.getByText('Union Station')).toBeInTheDocument()
    expect(screen.getByText('10 min')).toBeInTheDocument()
  })

  it('hides the mini live-status panel when phase is nodata', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: trip })
    mockUseLive.mockReturnValue({
      phase: 'nodata',
      isNoData: true,
      status: null,
      currentDerived: undefined,
      derivedStops: [],
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
