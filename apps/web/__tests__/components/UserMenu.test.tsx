import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockUseAuth = jest.fn()
jest.mock('../../app/components/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}))

import { signOut } from '../../app/lib/auth'

jest.mock('../../app/lib/auth', () => ({
  signOut: jest.fn(() => Promise.resolve()),
}))

jest.mock('../../app/components/AuthModal', () => {
  return function MockAuthModal({ onClose }: { onClose: () => void }) {
    return (
      <div data-testid="auth-modal">
        <button onClick={onClose}>close</button>
      </div>
    )
  }
})

import UserMenu from '../../app/components/UserMenu'

describe('UserMenu', () => {
  it('renders a placeholder while loading', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: true })
    const { container } = render(<UserMenu />)
    expect(container.firstChild).toHaveClass('h-8 w-8')
  })

  it('renders sign-in button when not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: false })
    render(<UserMenu />)
    expect(screen.getByLabelText('Sign in')).toBeInTheDocument()
  })

  it('opens auth modal when sign-in button is clicked', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: false })
    render(<UserMenu />)
    fireEvent.click(screen.getByLabelText('Sign in'))
    expect(screen.getByTestId('auth-modal')).toBeInTheDocument()
  })

  it('renders user initials when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: '123' },
      profile: { displayName: 'Test User', email: 'test@example.com', photoUrl: null },
      loading: false,
    })
    render(<UserMenu />)
    expect(screen.getByLabelText('User menu')).toHaveTextContent('TU')
  })

  it('shows dropdown with Profile and Sign Out', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: '123' },
      profile: { displayName: 'Test User', email: 'test@example.com', photoUrl: null },
      loading: false,
    })
    render(<UserMenu />)
    fireEvent.click(screen.getByLabelText('User menu'))
    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })

  it('calls signOut when Sign Out is clicked', async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: '123' },
      profile: { displayName: 'Test', email: 'test@example.com', photoUrl: null },
      loading: false,
    })
    render(<UserMenu />)
    fireEvent.click(screen.getByLabelText('User menu'))
    fireEvent.click(screen.getByText('Sign Out'))
    await waitFor(() => {
      expect(signOut).toHaveBeenCalled()
    })
  })
})
