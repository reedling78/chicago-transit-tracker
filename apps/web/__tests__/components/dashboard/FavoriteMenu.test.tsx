/**
 * @jest-environment jsdom
 */
import { render, fireEvent, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { Favorite } from '@ctt/shared'

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

import FavoriteMenu from '@components/dashboard/FavoriteMenu'
import { mockLine, mockStation } from '../../fixtures'

const lineFav: Favorite = { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }

beforeEach(() => {
  jest.clearAllMocks()
})

describe('FavoriteMenu', () => {
  it('renders all four menu items', () => {
    render(
      <FavoriteMenu
        favorite={lineFav}
        lines={[mockLine]}
        stations={[mockStation]}
        onClose={() => {}}
      />,
    )
    expect(screen.getByText('Open details')).toBeInTheDocument()
    expect(screen.getByText('Mute alerts')).toBeInTheDocument()
    expect(screen.getByText('Share')).toBeInTheDocument()
    expect(screen.getByText('Remove from favorites')).toBeInTheDocument()
  })

  it('Open details navigates to the favorite route and closes', () => {
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

  it('Mute alerts and Share are disabled placeholders', () => {
    render(
      <FavoriteMenu
        favorite={lineFav}
        lines={[mockLine]}
        stations={[mockStation]}
        onClose={() => {}}
      />,
    )
    expect(screen.getByText('Mute alerts')).toBeDisabled()
    expect(screen.getByText('Share')).toBeDisabled()
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

  it('clicking outside closes the menu', async () => {
    jest.useFakeTimers()
    const onClose = jest.fn()
    render(
      <div>
        <button data-testid="outside">Outside</button>
        <FavoriteMenu
          favorite={lineFav}
          lines={[mockLine]}
          stations={[mockStation]}
          onClose={onClose}
        />
      </div>,
    )
    // Advance timers so the deferred mousedown listener attaches.
    jest.runAllTimers()
    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(onClose).toHaveBeenCalled()
    jest.useRealTimers()
  })
})
