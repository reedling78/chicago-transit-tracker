import { Alert } from 'react-native'
import { render, fireEvent } from '@testing-library/react-native'
import FavoritesManager from '../../../components/profile/FavoritesManager'
import { useFavoritesStore } from '../../../lib/store/favorites'

const mockClearAll = jest.fn()
jest.mock('../../../lib/useClearAllFavorites', () => ({
  useClearAllFavorites: () => ({
    clearAll: mockClearAll,
    isClearing: false,
    needsAuth: false,
  }),
}))

jest.mock('../../../lib/useDashboardQueries', () => ({
  useLinesQuery: () => ({ data: [] }),
  useStationsQuery: () => ({ data: [] }),
}))

jest.mock('../../../components/profile/FavoritesSection', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, Text } = require('react-native')
  return function MockFavoritesSection({
    title,
    favorites,
  }: {
    title: string
    favorites: { id: string }[]
  }) {
    if (favorites.length === 0) return null
    return (
      <View testID={`section-${title}`}>
        <Text>
          {title} ({favorites.length})
        </Text>
      </View>
    )
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

beforeEach(() => {
  jest.clearAllMocks()
  useFavoritesStore.setState({ favorites: [], hydrated: false, pendingWrites: 0 })
})

describe('FavoritesManager (mobile)', () => {
  it('renders an empty state when there are no favorites', () => {
    const { getByText } = render(<FavoritesManager />)
    expect(getByText(/No favorites yet/i)).toBeOnTheScreen()
  })

  it('groups favorites into Lines, Stations, and Trains sections', () => {
    useFavoritesStore.setState({
      favorites: [
        { type: 'line', id: 'red', addedAt: '2026-01-01T00:00:00Z' },
        { type: 'station', id: 'clark-lake', addedAt: '2026-01-02T00:00:00Z' },
        { type: 'train', id: 'bnsf_1200', addedAt: '2026-01-03T00:00:00Z' },
      ],
    })
    const { getByTestId } = render(<FavoritesManager />)
    expect(getByTestId('section-Lines')).toBeOnTheScreen()
    expect(getByTestId('section-Stations')).toBeOnTheScreen()
    expect(getByTestId('section-Trains')).toBeOnTheScreen()
  })

  it('hides empty sections', () => {
    useFavoritesStore.setState({
      favorites: [{ type: 'line', id: 'red', addedAt: '2026-01-01T00:00:00Z' }],
    })
    const { getByTestId, queryByTestId } = render(<FavoritesManager />)
    expect(getByTestId('section-Lines')).toBeOnTheScreen()
    expect(queryByTestId('section-Stations')).toBeNull()
    expect(queryByTestId('section-Trains')).toBeNull()
  })

  it('confirms before calling clearAll and runs the destructive action', () => {
    useFavoritesStore.setState({
      favorites: [{ type: 'line', id: 'red', addedAt: '2026-01-01T00:00:00Z' }],
    })
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      const list = buttons as { style?: string; onPress?: () => void }[] | undefined
      list?.find((b) => b.style === 'destructive')?.onPress?.()
    })
    const { getByLabelText } = render(<FavoritesManager />)
    fireEvent.press(getByLabelText('Clear all favorites'))
    expect(alertSpy).toHaveBeenCalled()
    expect(mockClearAll).toHaveBeenCalledTimes(1)
    alertSpy.mockRestore()
  })

  it('does not call clearAll when the user cancels', () => {
    useFavoritesStore.setState({
      favorites: [{ type: 'line', id: 'red', addedAt: '2026-01-01T00:00:00Z' }],
    })
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    const { getByLabelText } = render(<FavoritesManager />)
    fireEvent.press(getByLabelText('Clear all favorites'))
    expect(mockClearAll).not.toHaveBeenCalled()
    alertSpy.mockRestore()
  })
})
