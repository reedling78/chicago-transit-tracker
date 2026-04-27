import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { Favorite } from '@ctt/shared'

jest.mock('../../../app/components/profile/FavoriteRow', () => {
  return function MockFavoriteRow({ favorite }: { favorite: Favorite }) {
    return <li data-testid={`row-${favorite.type}-${favorite.id}`}>{favorite.id}</li>
  }
})

import FavoritesSection from '../../../app/components/profile/FavoritesSection'

describe('FavoritesSection', () => {
  it('renders nothing when the favorites slice is empty', () => {
    const { container } = render(
      <FavoritesSection title="Lines" favorites={[]} lines={undefined} stations={undefined} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a header and a row per favorite', () => {
    const favorites: Favorite[] = [
      { type: 'line', id: 'red', addedAt: '2026-01-01T00:00:00Z' },
      { type: 'line', id: 'blue', addedAt: '2026-01-02T00:00:00Z' },
    ]
    render(
      <FavoritesSection
        title="Lines"
        favorites={favorites}
        lines={undefined}
        stations={undefined}
      />,
    )
    expect(screen.getByText('Lines')).toBeInTheDocument()
    expect(screen.getByTestId('row-line-red')).toBeInTheDocument()
    expect(screen.getByTestId('row-line-blue')).toBeInTheDocument()
  })
})
