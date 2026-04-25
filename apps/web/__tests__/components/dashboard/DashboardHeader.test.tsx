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

import DashboardHeader from '@components/dashboard/DashboardHeader'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('DashboardHeader', () => {
  it('shows the site name and a sign-in button when signed out', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: false })
    render(<DashboardHeader />)
    expect(screen.getByRole('heading', { name: 'Chicago Transit Tracker' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('opens the auth modal when the sign-in button is clicked', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: false })
    render(<DashboardHeader />)
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByTestId('auth-modal')).toBeInTheDocument()
  })

  it('shows the welcome greeting and a Profile link when signed in', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'u1' },
      profile: { displayName: 'Jane Smith' },
      loading: false,
    })
    render(<DashboardHeader />)
    expect(screen.getByRole('heading', { name: /Welcome back, Jane/ })).toBeInTheDocument()
    const profileLink = screen.getByRole('link', { name: 'Profile' })
    expect(profileLink).toHaveAttribute('href', '/profile')
  })

  it('renders an empty placeholder while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: true })
    const { container } = render(<DashboardHeader />)
    expect(container.querySelector('header')).toHaveAttribute('aria-hidden', 'true')
  })
})
