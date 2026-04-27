import { render, fireEvent } from '@testing-library/react-native'
import type { Favorite, Line, Station } from '@ctt/shared'
import FavoriteRow from '../../../components/profile/FavoriteRow'

const mockToggle = jest.fn()
jest.mock('../../../lib/useToggleFavorite', () => ({
  useToggleFavorite: () => ({ toggle: mockToggle, isToggling: false }),
}))

const mockUseFavoriteTripQuery = jest.fn()
jest.mock('../../../lib/useDashboardQueries', () => ({
  useFavoriteTripQuery: (id: string | null) => mockUseFavoriteTripQuery(id),
}))

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('@expo/vector-icons/Ionicons', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return {
    __esModule: true,
    default: ({ name }: { name: string }) => <Text>{name}</Text>,
  }
})

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}))

const lines: Line[] = [
  {
    slug: 'red',
    shortName: 'Red',
    name: 'Red Line',
    service: 'cta',
    color: '#c60c30',
    textColor: '#fff',
    termini: ['Howard', '95th/Dan Ryan'],
  } as unknown as Line,
]

const stations: Station[] = [
  {
    slug: 'clark-lake',
    name: 'Clark/Lake',
    service: 'cta',
    lines: ['Red', 'Blue'],
  } as unknown as Station,
]

beforeEach(() => {
  jest.clearAllMocks()
  mockUseFavoriteTripQuery.mockReturnValue({ data: null })
})

describe('FavoriteRow (mobile)', () => {
  it('renders a line favorite with name and termini', () => {
    const fav: Favorite = { type: 'line', id: 'red', addedAt: '2026-01-01T00:00:00Z' }
    const { getByText } = render(<FavoriteRow favorite={fav} lines={lines} stations={stations} />)
    expect(getByText('Red Line')).toBeOnTheScreen()
    expect(getByText('Howard — 95th/Dan Ryan')).toBeOnTheScreen()
  })

  it('renders a station favorite with line list', () => {
    const fav: Favorite = { type: 'station', id: 'clark-lake', addedAt: '2026-01-01T00:00:00Z' }
    const { getByText } = render(<FavoriteRow favorite={fav} lines={lines} stations={stations} />)
    expect(getByText('Clark/Lake')).toBeOnTheScreen()
    expect(getByText('Red • Blue')).toBeOnTheScreen()
  })

  it('renders a train favorite with trip data', () => {
    mockUseFavoriteTripQuery.mockReturnValue({
      data: { trainNumber: '1200', line: 'bnsf', headsign: 'Aurora' },
    })
    const fav: Favorite = { type: 'train', id: 'bnsf_1200', addedAt: '2026-01-01T00:00:00Z' }
    const { getByText } = render(<FavoriteRow favorite={fav} lines={lines} stations={stations} />)
    expect(getByText('Train 1200')).toBeOnTheScreen()
    expect(getByText('To Aurora')).toBeOnTheScreen()
  })

  it('navigates to the deep link when the row is pressed', () => {
    const fav: Favorite = { type: 'line', id: 'red', addedAt: '2026-01-01T00:00:00Z' }
    const { getByLabelText } = render(
      <FavoriteRow favorite={fav} lines={lines} stations={stations} />,
    )
    fireEvent.press(getByLabelText('Red Line'))
    expect(mockPush).toHaveBeenCalledWith('/cta/red')
  })

  it('calls toggle when the trash button is pressed', () => {
    const fav: Favorite = { type: 'line', id: 'red', addedAt: '2026-01-01T00:00:00Z' }
    const { getByLabelText } = render(
      <FavoriteRow favorite={fav} lines={lines} stations={stations} />,
    )
    fireEvent.press(getByLabelText('Remove Red Line from favorites'))
    expect(mockToggle).toHaveBeenCalledTimes(1)
  })
})
