/**
 * @jest-environment jsdom
 */
import { render, fireEvent, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { Favorite, StationSchedule } from '@ctt/shared'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockToggle = jest.fn()
jest.mock('@lib/hooks/useToggleFavorite', () => ({
  useToggleFavorite: () => ({
    isFavorited: true,
    toggle: mockToggle,
    isToggling: false,
    needsAuth: false,
  }),
}))

const mockUpdate = jest.fn()
jest.mock('@lib/hooks/useUpdateFavoriteSettings', () => ({
  useUpdateFavoriteSettings: () => ({ update: mockUpdate, isUpdating: false }),
}))

import FavoriteMenu from '@components/dashboard/FavoriteMenu'
import { mockLine, mockMetraLine, mockStation, mockMetraStation } from '../../fixtures'

const lineFav: Favorite = { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }
const ctaStationFav: Favorite = {
  type: 'station',
  id: 'clark-lake',
  addedAt: '2026-04-25T10:00:00Z',
}
const metraStationFav: Favorite = {
  type: 'station',
  id: 'aurora',
  addedAt: '2026-04-25T10:00:00Z',
}

const ctaSchedule: StationSchedule = {
  directions: [
    { headsign: 'Loop', line: 'Red', weekday: [], saturday: [], sunday: [] },
    { headsign: "O'Hare", line: 'Blue', weekday: [], saturday: [], sunday: [] },
  ],
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('FavoriteMenu', () => {
  it('renders the base menu items without removed placeholders', () => {
    render(
      <FavoriteMenu
        favorite={lineFav}
        lines={[mockLine]}
        stations={[mockStation]}
        onClose={() => {}}
      />,
    )
    expect(screen.getByText('Open details')).toBeInTheDocument()
    expect(screen.getByText('Remove from favorites')).toBeInTheDocument()
    expect(screen.queryByText('Mute alerts')).toBeNull()
    expect(screen.queryByText('Share')).toBeNull()
  })

  it('renders a header block for train favorites when header is provided', () => {
    const trainFav: Favorite = {
      type: 'train',
      id: 'md-w_2222',
      addedAt: '2026-04-25T10:00:00Z',
    }
    render(
      <FavoriteMenu
        favorite={trainFav}
        lines={[mockMetraLine]}
        stations={[mockMetraStation]}
        header={{ title: 'Schaumburg to Union Station', subtitle: 'MD-W #2222' }}
        onClose={() => {}}
      />,
    )
    expect(screen.getByText('Schaumburg to Union Station')).toBeInTheDocument()
    expect(screen.getByText('MD-W #2222')).toBeInTheDocument()
  })

  it('does not show View / Show toggle rows for line favorites', () => {
    render(
      <FavoriteMenu
        favorite={lineFav}
        lines={[mockLine]}
        stations={[mockStation]}
        onClose={() => {}}
      />,
    )
    expect(screen.queryByText('View')).toBeNull()
    expect(screen.queryByText('Show')).toBeNull()
  })

  it('Open details navigates and closes', () => {
    const onClose = jest.fn()
    render(
      <FavoriteMenu
        favorite={lineFav}
        lines={[mockLine]}
        stations={[mockStation]}
        onClose={onClose}
      />,
    )
    fireEvent.click(screen.getByText('Open details'))
    expect(mockPush).toHaveBeenCalledWith('/cta/red')
    expect(onClose).toHaveBeenCalled()
  })

  it('disables Open details when no route can be resolved', () => {
    render(
      <FavoriteMenu favorite={lineFav} lines={undefined} stations={undefined} onClose={() => {}} />,
    )
    expect(screen.getByText('Open details')).toBeDisabled()
  })

  it('Remove from favorites invokes toggle and closes', () => {
    const onClose = jest.fn()
    render(
      <FavoriteMenu
        favorite={lineFav}
        lines={[mockLine]}
        stations={[mockStation]}
        onClose={onClose}
      />,
    )
    fireEvent.click(screen.getByText('Remove from favorites'))
    expect(mockToggle).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('Escape key closes the menu', () => {
    const onClose = jest.fn()
    render(
      <FavoriteMenu
        favorite={lineFav}
        lines={[mockLine]}
        stations={[mockStation]}
        onClose={onClose}
      />,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  describe('station favorites', () => {
    it('renders View toggle that updates density', () => {
      render(
        <FavoriteMenu
          favorite={ctaStationFav}
          lines={[mockLine]}
          stations={[mockStation]}
          schedule={ctaSchedule}
          onClose={() => {}}
        />,
      )
      expect(screen.getByText('View')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('menuitemradio', { name: 'Compact' }))
      expect(mockUpdate).toHaveBeenCalledWith({ density: 'compact' })
    })

    it('renders Inbound/Outbound toggles for Metra stations', () => {
      render(
        <FavoriteMenu
          favorite={metraStationFav}
          lines={[mockMetraLine]}
          stations={[mockMetraStation]}
          onClose={() => {}}
        />,
      )
      expect(screen.getByRole('menuitemradio', { name: 'Inbound' })).toBeInTheDocument()
      expect(screen.getByRole('menuitemradio', { name: 'Outbound' })).toBeInTheDocument()
      fireEvent.click(screen.getByRole('menuitemradio', { name: 'Inbound' }))
      expect(mockUpdate).toHaveBeenCalledWith({ directionFilter: 'inbound' })
    })

    it('renders one chip per CTA headsign from the schedule', () => {
      render(
        <FavoriteMenu
          favorite={ctaStationFav}
          lines={[mockLine]}
          stations={[mockStation]}
          schedule={ctaSchedule}
          onClose={() => {}}
        />,
      )
      expect(screen.getByRole('menuitemradio', { name: 'Loop' })).toBeInTheDocument()
      expect(screen.getByRole('menuitemradio', { name: "O'Hare" })).toBeInTheDocument()
      fireEvent.click(screen.getByRole('menuitemradio', { name: 'Loop' }))
      expect(mockUpdate).toHaveBeenCalledWith({ directionFilter: 'Loop' })
    })

    it('marks the active option with aria-checked', () => {
      const compactFav: Favorite = { ...ctaStationFav, density: 'compact' }
      render(
        <FavoriteMenu
          favorite={compactFav}
          lines={[mockLine]}
          stations={[mockStation]}
          schedule={ctaSchedule}
          onClose={() => {}}
        />,
      )
      expect(screen.getByRole('menuitemradio', { name: 'Compact' })).toHaveAttribute(
        'aria-checked',
        'true',
      )
      expect(screen.getByRole('menuitemradio', { name: 'Expanded' })).toHaveAttribute(
        'aria-checked',
        'false',
      )
    })
  })
})
