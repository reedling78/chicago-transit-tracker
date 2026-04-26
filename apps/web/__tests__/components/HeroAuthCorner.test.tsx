import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

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

import HeroAuthCorner from '@components/HeroAuthCorner'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('HeroAuthCorner', () => {
  it('renders nothing visible while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: true })
    const { container } = render(<HeroAuthCorner />)
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('shows a Sign in button when signed out', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: false })
    render(<HeroAuthCorner />)
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('opens AuthModal when Sign in is clicked', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: false })
    render(<HeroAuthCorner />)
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByTestId('auth-modal')).toBeInTheDocument()
  })

  it("renders a Profile link with the user's first name when signed in", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'u1' },
      profile: { displayName: 'Jane Smith', photoUrl: null },
      loading: false,
    })
    render(<HeroAuthCorner />)
    const link = screen.getByRole('link', { name: /Jane/ })
    expect(link).toHaveAttribute('href', '/profile')
  })

  it('falls back to "Profile" when the user has no display name', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'u1' },
      profile: { displayName: null, photoUrl: null },
      loading: false,
    })
    render(<HeroAuthCorner />)
    expect(screen.getByRole('link', { name: 'Profile' })).toBeInTheDocument()
  })
})
