import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'

// Override the global FavoriteButton stub from jest.setup.ts; this test
// renders the real component.
jest.unmock('@components/FavoriteButton')

const mockToggle = jest.fn()
const mockUseToggleFavorite = jest.fn()
jest.mock('@lib/hooks/useToggleFavorite', () => ({
  useToggleFavorite: (...args: unknown[]) => mockUseToggleFavorite(...args),
}))

const mockUseAuth = jest.fn()
jest.mock('@components/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('@components/AuthModal', () => {
  return function MockAuthModal({ onClose }: { onClose: () => void }) {
    return (
      <div data-testid="auth-modal">
        <button onClick={onClose}>close</button>
      </div>
    )
  }
})

import FavoriteButton from '@components/FavoriteButton'
import { useFavoritesStore } from '@lib/store/favorites'

beforeEach(() => {
  jest.clearAllMocks()
  useFavoritesStore.setState({ favorites: [], hydrated: false })
  localStorage.clear()
})

describe('FavoriteButton', () => {
  it('shows the outline heart with "Add to favorites" label when not favorited', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    mockUseToggleFavorite.mockReturnValue({
      isFavorited: false,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: false,
    })
    render(<FavoriteButton type="line" id="red" />)
    const btn = screen.getByRole('button', { name: 'Add to favorites' })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows the filled heart with "Remove from favorites" label when favorited', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    mockUseToggleFavorite.mockReturnValue({
      isFavorited: true,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: false,
    })
    render(<FavoriteButton type="line" id="red" />)
    const btn = screen.getByRole('button', { name: 'Remove from favorites' })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls toggle on click when signed in', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    mockUseToggleFavorite.mockReturnValue({
      isFavorited: false,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: false,
    })
    render(<FavoriteButton type="station" id="clark-lake" />)
    fireEvent.click(screen.getByRole('button'))
    expect(mockToggle).toHaveBeenCalled()
  })

  it('opens AuthModal instead of toggling when signed out', () => {
    mockUseAuth.mockReturnValue({ user: null })
    mockUseToggleFavorite.mockReturnValue({
      isFavorited: false,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: true,
    })
    render(<FavoriteButton type="line" id="red" />)
    fireEvent.click(screen.getByRole('button', { name: 'Add to favorites' }))
    expect(screen.getByTestId('auth-modal')).toBeInTheDocument()
    expect(mockToggle).not.toHaveBeenCalled()
  })

  it('applies the pending favorite after sign-in completes', async () => {
    mockUseAuth.mockReturnValue({ user: null })
    mockUseToggleFavorite.mockReturnValue({
      isFavorited: false,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: true,
    })

    const { rerender } = render(<FavoriteButton type="line" id="red" />)
    fireEvent.click(screen.getByRole('button', { name: 'Add to favorites' }))
    expect(screen.getByTestId('auth-modal')).toBeInTheDocument()
    expect(mockToggle).not.toHaveBeenCalled()

    // simulate sign-in
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    mockUseToggleFavorite.mockReturnValue({
      isFavorited: false,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: false,
    })
    await act(async () => {
      rerender(<FavoriteButton type="line" id="red" />)
    })

    await waitFor(() => {
      expect(mockToggle).toHaveBeenCalledTimes(1)
    })
  })

  it('does not re-apply the pending favorite if it was already added (different device)', async () => {
    mockUseAuth.mockReturnValue({ user: null })
    mockUseToggleFavorite.mockReturnValue({
      isFavorited: false,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: true,
    })

    const { rerender } = render(<FavoriteButton type="line" id="red" />)
    fireEvent.click(screen.getByRole('button', { name: 'Add to favorites' }))

    // simulate the just-signed-in state where the favorite already exists in the store
    useFavoritesStore.setState({
      favorites: [{ type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }],
      hydrated: true,
    })
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    mockUseToggleFavorite.mockReturnValue({
      isFavorited: true,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: false,
    })

    await act(async () => {
      rerender(<FavoriteButton type="line" id="red" />)
    })

    expect(mockToggle).not.toHaveBeenCalled()
  })

  it('disables the button while a write is in flight', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    mockUseToggleFavorite.mockReturnValue({
      isFavorited: false,
      toggle: mockToggle,
      isToggling: true,
      needsAuth: false,
    })
    render(<FavoriteButton type="line" id="red" />)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
