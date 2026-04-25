import { Text } from 'react-native'
import { render, waitFor } from '@testing-library/react-native'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import {
  useAlerts,
  useLine,
  useLines,
  useLineStations,
  useMetraTrip,
  useSchedule,
  useStation,
  useStationTrips,
} from '../../lib/hooks'
import {
  mockCtaAlert,
  mockLine,
  mockMetraLine,
  mockStation,
  mockMetraStation,
  mockSchedule,
  mockStationTrips,
} from '../fixtures'

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db, name: string) => ({ __collection: name })),
  query: jest.fn((coll, ...constraints) => ({ __query: coll, constraints })),
  where: jest.fn((field, op, value) => ({ __where: { field, op, value } })),
  orderBy: jest.fn((field) => ({ __orderBy: field })),
  doc: jest.fn((_db, coll: string, id: string) => ({ __doc: { coll, id } })),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  getFirestore: jest.fn(() => ({})),
}))

jest.mock('../../lib/firebase', () => ({ db: {} }))
jest.mock('../../lib/config', () => ({
  FUNCTIONS_BASE_URL: 'https://test.cloudfunctions.net',
}))

const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>
const mockCollection = collection as jest.MockedFunction<typeof collection>
const mockDoc = doc as jest.MockedFunction<typeof doc>
const mockQuery = query as jest.MockedFunction<typeof query>
const mockWhere = where as jest.MockedFunction<typeof where>

afterEach(() => {
  jest.clearAllMocks()
})

function snapOfDocs<T extends { slug: string }>(items: T[]): any {
  return {
    docs: items.map((item) => ({
      id: item.slug,
      data: () => item,
    })),
  }
}

function singleDocSnap<T>(data: T | null): any {
  return {
    id: (data as any)?.slug ?? 'missing',
    exists: () => data !== null,
    data: () => data,
  }
}

function LinesProbe({ service }: { service: 'cta' | 'metra' }) {
  const { lines, loading } = useLines(service)
  if (loading) return <Text>loading</Text>
  return <Text>lines:{lines.map((l) => l.slug).join(',')}</Text>
}

function StationProbe({ slug }: { slug: string }) {
  const { station, loading } = useStation(slug)
  if (loading) return <Text>loading</Text>
  return <Text>station:{station?.slug ?? 'null'}</Text>
}

function LineProbe({ slug }: { slug: string }) {
  const { line, loading } = useLine(slug)
  if (loading) return <Text>loading</Text>
  return <Text>line:{line?.slug ?? 'null'}</Text>
}

function LineStationsProbe({ line, short }: { line: string; short: string }) {
  const { stations, loading } = useLineStations(line, short)
  if (loading) return <Text>loading</Text>
  return <Text>stations:{stations.map((s) => s.slug).join(',')}</Text>
}

function ScheduleProbe({ slug }: { slug: string }) {
  const { schedule, loading } = useSchedule(slug)
  if (loading) return <Text>loading</Text>
  return <Text>schedule:{schedule?.directions.length ?? 'null'}</Text>
}

describe('useLines', () => {
  it('queries the lines collection filtered by service and returns the results', async () => {
    mockGetDocs.mockResolvedValueOnce(snapOfDocs([mockLine]))
    const { getByText } = render(<LinesProbe service="cta" />)
    expect(getByText('loading')).toBeOnTheScreen()
    await waitFor(() => expect(getByText('lines:red')).toBeOnTheScreen())

    expect(mockCollection).toHaveBeenCalledWith({}, 'lines')
    expect(mockWhere).toHaveBeenCalledWith('service', '==', 'cta')
    expect(mockQuery).toHaveBeenCalled()
  })

  it('filters by metra service when requested', async () => {
    mockGetDocs.mockResolvedValueOnce(snapOfDocs([mockMetraLine]))
    const { getByText } = render(<LinesProbe service="metra" />)
    await waitFor(() => expect(getByText('lines:bnsf')).toBeOnTheScreen())
    expect(mockWhere).toHaveBeenCalledWith('service', '==', 'metra')
  })
})

describe('useStation', () => {
  it('returns the station document when it exists', async () => {
    mockGetDoc.mockResolvedValueOnce(singleDocSnap(mockStation))
    const { getByText } = render(<StationProbe slug="clark-lake" />)
    await waitFor(() => expect(getByText('station:clark-lake')).toBeOnTheScreen())
    expect(mockDoc).toHaveBeenCalledWith({}, 'stations', 'clark-lake')
  })

  it('returns null when the station document does not exist', async () => {
    mockGetDoc.mockResolvedValueOnce(singleDocSnap(null))
    const { getByText } = render(<StationProbe slug="missing" />)
    await waitFor(() => expect(getByText('station:null')).toBeOnTheScreen())
  })
})

describe('useLine', () => {
  it('returns the line document when it exists', async () => {
    mockGetDoc.mockResolvedValueOnce(singleDocSnap(mockLine))
    const { getByText } = render(<LineProbe slug="red" />)
    await waitFor(() => expect(getByText('line:red')).toBeOnTheScreen())
    expect(mockDoc).toHaveBeenCalledWith({}, 'lines', 'red')
  })

  it('returns null when the line document does not exist', async () => {
    mockGetDoc.mockResolvedValueOnce(singleDocSnap(null))
    const { getByText } = render(<LineProbe slug="ghost" />)
    await waitFor(() => expect(getByText('line:null')).toBeOnTheScreen())
  })
})

describe('useLineStations', () => {
  it('queries stations with array-contains and sorts by lineOrder for that line', async () => {
    const a = { ...mockStation, slug: 'a', lineOrder: { Red: 5 } }
    const b = { ...mockStation, slug: 'b', lineOrder: { Red: 1 } }
    const c = { ...mockStation, slug: 'c', lineOrder: { Red: 3 } }
    mockGetDocs.mockResolvedValueOnce(snapOfDocs([a, b, c]))

    const { getByText } = render(<LineStationsProbe line="red" short="Red" />)
    await waitFor(() => expect(getByText('stations:b,c,a')).toBeOnTheScreen())

    expect(mockWhere).toHaveBeenCalledWith('lines', 'array-contains', 'Red')
  })

  it('places stations without a lineOrder entry at the end', async () => {
    const known = { ...mockStation, slug: 'known', lineOrder: { Red: 2 } }
    const unknown = { ...mockStation, slug: 'unknown', lineOrder: {} }
    mockGetDocs.mockResolvedValueOnce(snapOfDocs([unknown, known]))

    const { getByText } = render(<LineStationsProbe line="red" short="Red" />)
    await waitFor(() => expect(getByText('stations:known,unknown')).toBeOnTheScreen())
  })

  it('handles metra line queries using the metra shortName', async () => {
    mockGetDocs.mockResolvedValueOnce(snapOfDocs([mockMetraStation]))
    const { getByText } = render(<LineStationsProbe line="bnsf" short="BNSF" />)
    await waitFor(() => expect(getByText('stations:aurora')).toBeOnTheScreen())
    expect(mockWhere).toHaveBeenCalledWith('lines', 'array-contains', 'BNSF')
  })
})

function AlertsProbe({ service, routeId }: { service: 'cta' | 'metra'; routeId?: string }) {
  const { alerts, loading, error } = useAlerts(service, routeId)
  if (loading) return <Text>loading</Text>
  if (error) return <Text>error:{error}</Text>
  return <Text>alerts:{alerts.map((a) => a.id).join(',')}</Text>
}

const originalFetch = global.fetch

describe('useAlerts', () => {
  afterEach(() => {
    global.fetch = originalFetch
  })

  it('fetches CTA alerts and returns results', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([mockCtaAlert]),
    }) as unknown as typeof fetch

    const { getByText } = render(<AlertsProbe service="cta" />)
    expect(getByText('loading')).toBeOnTheScreen()
    await waitFor(() => expect(getByText('alerts:1')).toBeOnTheScreen())

    expect(global.fetch).toHaveBeenCalledWith('https://test.cloudfunctions.net/ctaAlerts')
  })

  it('fetches Metra alerts with routeId', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }) as unknown as typeof fetch

    const { getByText } = render(<AlertsProbe service="metra" routeId="BNSF" />)
    await waitFor(() => expect(getByText('alerts:')).toBeOnTheScreen())

    expect(global.fetch).toHaveBeenCalledWith(
      'https://test.cloudfunctions.net/metraAlerts?routeId=BNSF',
    )
  })

  it('shows error when fetch fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }) as unknown as typeof fetch

    const { getByText } = render(<AlertsProbe service="cta" />)
    await waitFor(() => expect(getByText('error:Alert API error: 500')).toBeOnTheScreen())
  })
})

describe('useSchedule', () => {
  it('returns the schedule document when it exists', async () => {
    mockGetDoc.mockResolvedValueOnce({
      id: 'clark-lake',
      exists: () => true,
      data: () => mockSchedule,
    } as any)
    const { getByText } = render(<ScheduleProbe slug="clark-lake" />)
    await waitFor(() => expect(getByText('schedule:2')).toBeOnTheScreen())
    expect(mockDoc).toHaveBeenCalledWith({}, 'schedules', 'clark-lake')
  })

  it('returns null when the schedule document does not exist', async () => {
    mockGetDoc.mockResolvedValueOnce(singleDocSnap(null))
    const { getByText } = render(<ScheduleProbe slug="missing" />)
    await waitFor(() => expect(getByText('schedule:null')).toBeOnTheScreen())
  })
})

function StationTripsProbe({ slug }: { slug: string }) {
  const { stationTrips, loading } = useStationTrips(slug)
  if (loading) return <Text>loading</Text>
  return <Text>trips:{stationTrips?.weekday.length ?? 'null'}</Text>
}

describe('useStationTrips', () => {
  it('returns station trips document when it exists', async () => {
    mockGetDoc.mockResolvedValueOnce({
      id: 'aurora',
      exists: () => true,
      data: () => mockStationTrips,
    } as any)
    const { getByText } = render(<StationTripsProbe slug="aurora" />)
    await waitFor(() => expect(getByText('trips:3')).toBeOnTheScreen())
    expect(mockDoc).toHaveBeenCalledWith({}, 'metra-station-trips', 'aurora')
  })

  it('returns null when the station trips document does not exist', async () => {
    mockGetDoc.mockResolvedValueOnce(singleDocSnap(null))
    const { getByText } = render(<StationTripsProbe slug="missing" />)
    await waitFor(() => expect(getByText('trips:null')).toBeOnTheScreen())
  })
})

function MetraTripProbe({ line, train }: { line: string; train: string }) {
  const { trip, loading } = useMetraTrip(line, train)
  if (loading) return <Text>loading</Text>
  return <Text>trip:{trip ? `${trip.trainNumber}-${trip.stops.length}` : 'null'}</Text>
}

describe('useMetraTrip', () => {
  it('reads metra-trips/{lineSlug}_{trainNumber} from Firestore', async () => {
    mockGetDoc.mockResolvedValueOnce({
      id: 'bnsf_1200',
      exists: () => true,
      data: () => ({
        tripId: 'BNSF_BN1200_V4',
        trainNumber: '1200',
        headsign: 'Aurora',
        line: 'BNSF',
        lineSlug: 'bnsf',
        lineName: 'BNSF Railway',
        serviceType: 'weekday',
        directionId: 0,
        stops: [
          { sequence: 1, stationName: 'Union Station', slug: 'chicago-union-station-metra' },
          { sequence: 2, stationName: 'Western Ave', slug: 'western-ave-bnsf' },
        ],
      }),
    } as any)

    const { getByText } = render(<MetraTripProbe line="bnsf" train="1200" />)
    await waitFor(() => expect(getByText('trip:1200-2')).toBeOnTheScreen())
    expect(mockDoc).toHaveBeenCalledWith({}, 'metra-trips', 'bnsf_1200')
  })

  it('returns null when the trip document does not exist', async () => {
    mockGetDoc.mockResolvedValueOnce(singleDocSnap(null))
    const { getByText } = render(<MetraTripProbe line="bnsf" train="9999" />)
    await waitFor(() => expect(getByText('trip:null')).toBeOnTheScreen())
  })

  it('skips fetching when lineSlug or trainNumber is empty', async () => {
    const { getByText } = render(<MetraTripProbe line="" train="" />)
    await waitFor(() => expect(getByText('trip:null')).toBeOnTheScreen())
    expect(mockGetDoc).not.toHaveBeenCalled()
  })
})
