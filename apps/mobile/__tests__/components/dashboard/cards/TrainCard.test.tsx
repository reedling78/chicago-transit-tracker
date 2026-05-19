import { render, fireEvent } from '@testing-library/react-native'
import type { Favorite, Line, MetraTripDetail } from '@ctt/shared'
import TrainCard from '../../../../components/dashboard/cards/TrainCard'

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockUseFavoriteTripQuery = jest.fn()
jest.mock('../../../../lib/useDashboardQueries', () => ({
  useFavoriteTripQuery: (tripId: string | null) => mockUseFavoriteTripQuery(tripId),
}))

const mockUseLive = jest.fn()
jest.mock('../../../../lib/useMetraTripLiveStatus', () => ({
  useMetraTripLiveStatus: (...args: unknown[]) => mockUseLive(...args),
}))

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
  mockUseLive.mockReset()
  mockUseLive.mockReturnValue(null)
})

describe('TrainCard (mobile)', () => {
  it('renders an "origin to destination" header from the trip stops', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: trip })
    const { getByText } = render(
      <TrainCard favorite={fav} lines={lines} onLongPress={() => {}} onMenuPress={() => {}} />,
    )
    expect(getByText('Big Timber to Union Station')).toBeTruthy()
  })

  it('uses overrides from the favorite to render a custom segment', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: trip })
    const { getByText } = render(
      <TrainCard
        favorite={{
          ...fav,
          trainOriginStopSlug: 'schaumburg',
          trainDestinationStopSlug: 'western-avenue-metra',
        }}
        lines={lines}
        onLongPress={() => {}}
        onMenuPress={() => {}}
      />,
    )
    expect(getByText('Schaumburg to Western Avenue')).toBeTruthy()
  })

  it('folds the agency, line, and train number into a single subheader (no pills)', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: trip })
    const { getByText, queryByText } = render(
      <TrainCard favorite={fav} lines={lines} onLongPress={() => {}} onMenuPress={() => {}} />,
    )
    expect(getByText('MD-W #2222')).toBeTruthy()
    expect(queryByText('Weekday')).toBeNull()
    expect(queryByText('Express')).toBeNull()
  })

  it('falls back to "Train ${trainNumber}" + bare #number subheader when trip data is missing', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: null })
    const { getByText } = render(
      <TrainCard
        favorite={{ type: 'train', id: 'bnsf_9999', addedAt: '2026-04-25T10:00:00Z' }}
        lines={undefined}
        onLongPress={() => {}}
        onMenuPress={() => {}}
      />,
    )
    expect(getByText('Train 9999')).toBeTruthy()
    expect(getByText('#9999')).toBeTruthy()
  })

  it('navigates to /metra/{line}/train/{trainNumber} on press', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: null })
    const { getByLabelText } = render(
      <TrainCard favorite={fav} lines={undefined} onLongPress={() => {}} onMenuPress={() => {}} />,
    )
    fireEvent.press(getByLabelText('Train 2222'))
    expect(mockPush).toHaveBeenCalledWith('/metra/md-w/train/2222')
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
    const { getByText } = render(
      <TrainCard favorite={fav} lines={lines} onLongPress={() => {}} onMenuPress={() => {}} />,
    )
    expect(getByText('On time')).toBeTruthy()
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
    const { queryByText } = render(
      <TrainCard favorite={fav} lines={lines} onLongPress={() => {}} onMenuPress={() => {}} />,
    )
    expect(queryByText('On time')).toBeNull()
  })

  it('shows a countdown to the origin departure when there is no live data', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-04-25T05:48:00'))
    try {
      mockUseFavoriteTripQuery.mockReturnValue({ data: trip })
      mockUseLive.mockReturnValue(null)
      const { getByText } = render(
        <TrainCard favorite={fav} lines={lines} onLongPress={() => {}} onMenuPress={() => {}} />,
      )
      expect(getByText('Departs in 12 min · 6:00 AM from Big Timber')).toBeTruthy()
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
      const { getByText } = render(
        <TrainCard favorite={fav} lines={lines} onLongPress={() => {}} onMenuPress={() => {}} />,
      )
      expect(getByText('Departed 6:00 AM · Next train Monday')).toBeTruthy()
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
      const { getByText } = render(
        <TrainCard favorite={fav} lines={lines} onLongPress={() => {}} onMenuPress={() => {}} />,
      )
      expect(getByText('Departed 6:00 AM · Next train tomorrow')).toBeTruthy()
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
    const { getByText, getByLabelText, queryByText } = render(
      <TrainCard favorite={fav} lines={lines} onLongPress={() => {}} onMenuPress={() => {}} />,
    )
    expect(getByText('On time')).toBeTruthy()
    expect(getByLabelText('Receiving live data')).toBeTruthy()
    expect(getByText('Live')).toBeTruthy()
    expect(getByText('MD-W #2222')).toBeTruthy()
    expect(queryByText(/Departs in/)).toBeNull()
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
    const { getByText } = render(
      <TrainCard favorite={fav} lines={lines} onLongPress={() => {}} onMenuPress={() => {}} />,
    )
    expect(getByText('Delayed 7 min')).toBeTruthy()
    expect(getByText('Next stop')).toBeTruthy()
    expect(getByText('Schaumburg')).toBeTruthy()
    expect(getByText(/^Arrives /)).toBeTruthy()
    expect(getByText('Union Station')).toBeTruthy()
    expect(getByText('10 min')).toBeTruthy()
  })

  it('opens the menu on overflow tap', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: trip })
    const onMenuPress = jest.fn()
    const { getByLabelText } = render(
      <TrainCard favorite={fav} lines={lines} onLongPress={() => {}} onMenuPress={onMenuPress} />,
    )
    fireEvent.press(getByLabelText('Open menu for Big Timber to Union Station'))
    expect(onMenuPress).toHaveBeenCalled()
  })
})
