/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { Favorite } from '@ctt/shared'

const mockUseAuth = jest.fn()
jest.mock('@components/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('@components/AuthModal', () => {
  return function MockAuthModal({
    onClose,
    initialMode,
  }: {
    onClose: () => void
    initialMode?: string
  }) {
    return (
      <div data-testid="auth-modal-stub" data-initial-mode={initialMode ?? 'signIn'}>
        <button onClick={onClose}>close</button>
      </div>
    )
  }
})

import DashboardHeader from '@components/dashboard/DashboardHeader'
import { useFavoritesStore } from '@lib/store/favorites'

beforeEach(() => {
  jest.clearAllMocks()
  useFavoritesStore.setState({ favorites: [], hydrated: false, pendingWrites: 0 })
  localStorage.clear()
})

describe('DashboardHeader', () => {
  it('renders nothing while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: true })
    const { container } = render(<DashboardHeader />)
    expect(container).toBeEmptyDOMElement()
  })

  describe('unauthed', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: null, profile: null, loading: false })
    })

    it('shows the marketing headline and tagline', () => {
      render(<DashboardHeader />)
      expect(screen.getByRole('heading', { name: 'Chicago Transit Tracker' })).toBeInTheDocument()
      expect(screen.getByText(/Real-time schedules, routes, and station info/i)).toBeInTheDocument()
    })

    it('shows the sign-up call-to-action with both buttons', () => {
      render(<DashboardHeader />)
      expect(screen.getByText(/Sign up to customize your dashboard/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Sign up' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument()
    })

    it('opens AuthModal in sign-up mode when Sign up is clicked', () => {
      render(<DashboardHeader />)
      expect(screen.queryByTestId('auth-modal-stub')).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Sign up' }))
      const modal = screen.getByTestId('auth-modal-stub')
      expect(modal).toBeInTheDocument()
      expect(modal).toHaveAttribute('data-initial-mode', 'signUp')
    })

    it('opens AuthModal in sign-in mode when Log in is clicked', () => {
      render(<DashboardHeader />)
      fireEvent.click(screen.getByRole('button', { name: 'Log in' }))
      const modal = screen.getByTestId('auth-modal-stub')
      expect(modal).toHaveAttribute('data-initial-mode', 'signIn')
    })

    it('does not render the "Your Dashboard" heading or empty card', () => {
      render(<DashboardHeader />)
      expect(screen.queryByText('Your Dashboard')).not.toBeInTheDocument()
      expect(screen.queryByText('No favorites yet')).not.toBeInTheDocument()
    })
  })

  describe('authed with no favorites', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'u1' },
        profile: null,
        loading: false,
      })
    })

    it('shows the "Your Dashboard" heading', () => {
      render(<DashboardHeader />)
      expect(screen.getByRole('heading', { name: 'Your Dashboard' })).toBeInTheDocument()
    })

    it('uses the displayName when available', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'u1' },
        profile: { displayName: 'Reed Rizzo' },
        loading: false,
      })
      render(<DashboardHeader />)
      expect(screen.getByRole('heading', { name: /Welcome back, Reed/ })).toBeInTheDocument()
    })

    it('shows the empty card with quick links to /cta and /metra', () => {
      render(<DashboardHeader />)
      expect(screen.getByText('No favorites yet')).toBeInTheDocument()
      const ctaLink = screen.getByRole('link', { name: /Browse CTA/ })
      const metraLink = screen.getByRole('link', { name: /Browse Metra/ })
      expect(ctaLink).toHaveAttribute('href', '/cta')
      expect(metraLink).toHaveAttribute('href', '/metra')
    })

    it('does not render the unauthed marketing hero', () => {
      render(<DashboardHeader />)
      expect(
        screen.queryByRole('heading', { name: 'Chicago Transit Tracker' }),
      ).not.toBeInTheDocument()
    })
  })

  describe('authed with favorites', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'u1' },
        profile: null,
        loading: false,
      })
      const favs: Favorite[] = [{ type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }]
      useFavoritesStore.getState().hydrate(favs)
    })

    it('shows the heading but not the empty card', () => {
      render(<DashboardHeader />)
      expect(screen.getByRole('heading', { name: 'Your Dashboard' })).toBeInTheDocument()
      expect(screen.queryByText('No favorites yet')).not.toBeInTheDocument()
    })
  })
})
