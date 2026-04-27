import { render } from '@testing-library/react-native'
import type { Favorite } from '@ctt/shared'
import FavoritesSection from '../../../components/profile/FavoritesSection'

jest.mock('../../../components/profile/FavoriteRow', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, Text } = require('react-native')
  return function MockFavoriteRow({ favorite }: { favorite: Favorite }) {
    return (
      <View testID={`row-${favorite.type}-${favorite.id}`}>
        <Text>{favorite.id}</Text>
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

describe('FavoritesSection (mobile)', () => {
  it('renders nothing when the favorites slice is empty', () => {
    const { toJSON } = render(
      <FavoritesSection title="Lines" favorites={[]} lines={undefined} stations={undefined} />,
    )
    expect(toJSON()).toBeNull()
  })

  it('renders an upper-cased header and a row per favorite', () => {
    const favorites: Favorite[] = [
      { type: 'line', id: 'red', addedAt: '2026-01-01T00:00:00Z' },
      { type: 'line', id: 'blue', addedAt: '2026-01-02T00:00:00Z' },
    ]
    const { getByText, getByTestId } = render(
      <FavoritesSection
        title="Lines"
        favorites={favorites}
        lines={undefined}
        stations={undefined}
      />,
    )
    expect(getByText('LINES')).toBeOnTheScreen()
    expect(getByTestId('row-line-red')).toBeOnTheScreen()
    expect(getByTestId('row-line-blue')).toBeOnTheScreen()
  })
})
