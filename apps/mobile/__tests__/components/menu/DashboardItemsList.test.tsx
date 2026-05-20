import { render, fireEvent } from '@testing-library/react-native'
import DashboardItemsList from '../../../components/menu/DashboardItemsList'
import { useDashboardStore } from '../../../lib/store/dashboard'

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockLines = jest.fn()
const mockStations = jest.fn()
const mockTrip = jest.fn()
jest.mock('../../../lib/useDashboardQueries', () => ({
  useLinesQuery: () => mockLines(),
  useStationsQuery: () => mockStations(),
  useDashboardItemTripQuery: (id: string | null) => mockTrip(id),
}))

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>()
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k: string) => store.get(k) ?? null),
      setItem: jest.fn(async () => {}),
      removeItem: jest.fn(async () => {}),
      clear: jest.fn(async () => store.clear()),
      getAllKeys: jest.fn(async () => Array.from(store.keys())),
    },
  }
})

const fakeRedLine = {
  slug: 'red',
  name: 'Red Line',
  shortName: 'Red',
  service: 'cta',
  termini: ['Howard', '95th/Dan Ryan'],
}
const fakeBnsf = { slug: 'bnsf', name: 'BNSF', shortName: 'BNSF', service: 'metra', termini: [] }
const fakeStation = { slug: 'clark-lake', name: 'Clark/Lake', service: 'cta', lines: ['Red'] }

beforeEach(() => {
  jest.clearAllMocks()
  useDashboardStore.setState({ items: [], hydrated: false, pendingWrites: 0 })
  mockLines.mockReturnValue({ data: [fakeRedLine, fakeBnsf] })
  mockStations.mockReturnValue({ data: [fakeStation] })
  // Default: no trip loaded yet — train rows fall back to "Train {n}".
  mockTrip.mockReturnValue({ data: null })
})

describe('DashboardItemsList (mobile)', () => {
  it('shows an empty-state hint when no items', () => {
    const { getByText } = render(<DashboardItemsList />)
    expect(getByText(/Tap "\+ Dashboard"/)).toBeTruthy()
  })

  it('renders group headings in order Trains / Stations / Lines', () => {
    useDashboardStore.setState({
      items: [
        { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' },
        { type: 'station', id: 'clark-lake', addedAt: '2026-04-25T11:00:00Z' },
        { type: 'train', id: 'bnsf_1234', addedAt: '2026-04-25T12:00:00Z' },
      ],
    })
    const { getAllByRole } = render(<DashboardItemsList />)
    const headers = getAllByRole('header').map((h) => h.props.children)
    expect(headers).toEqual(['Trains', 'Stations', 'Lines'])
  })

  it('skips section heading for empty groups', () => {
    useDashboardStore.setState({
      items: [{ type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }],
    })
    const { queryByText, getByText } = render(<DashboardItemsList />)
    expect(queryByText('Trains')).toBeNull()
    expect(queryByText('Stations')).toBeNull()
    expect(getByText('Lines')).toBeTruthy()
  })

  it('navigates to the deep link on row press and calls onNavigate', () => {
    useDashboardStore.setState({
      items: [{ type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }],
    })
    const onNavigate = jest.fn()
    const { getByLabelText } = render(<DashboardItemsList onNavigate={onNavigate} />)
    fireEvent.press(getByLabelText('Red Line'))
    expect(onNavigate).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/cta/red')
  })

  it('falls back to "Train {n}" while the trip is still loading', () => {
    mockTrip.mockReturnValue({ data: null })
    useDashboardStore.setState({
      items: [{ type: 'train', id: 'bnsf_1234', addedAt: '2026-04-25T11:00:00Z' }],
    })
    const { getByLabelText, getByText } = render(<DashboardItemsList />)
    expect(getByLabelText('Train 1234')).toBeTruthy()
    expect(getByText('BNSF #1234')).toBeTruthy()
  })

  it('renders origin → destination as the train row title once the trip resolves', () => {
    mockTrip.mockReturnValue({
      data: {
        trainNumber: '1234',
        line: 'BNSF',
        lineSlug: 'bnsf',
        stops: [
          { slug: 'union-station', stationName: 'Chicago Union Station', departure: '5:42 PM' },
          { slug: 'naperville', stationName: 'Naperville', departure: '6:18 PM' },
          { slug: 'aurora', stationName: 'Aurora', departure: '6:42 PM' },
        ],
      },
    })
    useDashboardStore.setState({
      items: [{ type: 'train', id: 'bnsf_1234', addedAt: '2026-04-25T11:00:00Z' }],
    })
    const { getByLabelText, getByText } = render(<DashboardItemsList />)
    // Mirrors the dashboard TrainCard: origin → destination, with Chicago
    // Union Station shortened to Union Station.
    expect(getByLabelText('Union Station to Aurora')).toBeTruthy()
    expect(getByText('BNSF #1234')).toBeTruthy()
  })

  it('honors per-item origin/destination overrides', () => {
    mockTrip.mockReturnValue({
      data: {
        trainNumber: '1234',
        line: 'BNSF',
        lineSlug: 'bnsf',
        stops: [
          { slug: 'union-station', stationName: 'Chicago Union Station', departure: '5:42 PM' },
          { slug: 'naperville', stationName: 'Naperville', departure: '6:18 PM' },
          { slug: 'aurora', stationName: 'Aurora', departure: '6:42 PM' },
        ],
      },
    })
    useDashboardStore.setState({
      items: [
        {
          type: 'train',
          id: 'bnsf_1234',
          addedAt: '2026-04-25T11:00:00Z',
          trainOriginStopSlug: 'naperville',
          trainDestinationStopSlug: 'aurora',
        },
      ],
    })
    const { getByLabelText } = render(<DashboardItemsList />)
    expect(getByLabelText('Naperville to Aurora')).toBeTruthy()
  })
})
