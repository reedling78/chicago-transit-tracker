import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockUseAuth = jest.fn()
jest.mock('../../app/components/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('../../app/lib/auth', () => ({
  signOut: jest.fn(() => Promise.resolve()),
}))

jest.mock('../../app/components/AuthModal', () => {
  return function MockAuthModal() {
    return <div data-testid="auth-modal" />
  }
})

import ProfileContent from '../../app/profile/ProfileContent'

describe('ProfileContent', () => {
  it('shows loading spinner when loading', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: true })
    const { container } = render(<ProfileContent />)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows sign-in prompt when not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null, loading: false })
    render(<ProfileContent />)
    expect(screen.getByText('Sign in to view your profile.')).toBeInTheDocument()
    expect(screen.getByText('Sign In')).toBeInTheDocument()
  })

  it('shows profile info when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: '123' },
      profile: {
        uid: '123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoUrl: null,
        provider: 'google',
        createdAt: '2026-01-15T00:00:00Z',
        updatedAt: '2026-01-15T00:00:00Z',
      },
      loading: false,
    })
    render(<ProfileContent />)
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('Google')).toBeInTheDocument()
    // Date formatting is locale-dependent; just check the year appears
    expect(screen.getByText(/2026/)).toBeInTheDocument()
    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })

  it('shows "Not set" for missing display name', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: '123' },
      profile: {
        uid: '123',
        email: 'test@example.com',
        displayName: null,
        photoUrl: null,
        provider: 'password',
        createdAt: '2026-01-15T00:00:00Z',
        updatedAt: '2026-01-15T00:00:00Z',
      },
      loading: false,
    })
    render(<ProfileContent />)
    expect(screen.getByText('Not set')).toBeInTheDocument()
    expect(screen.getByText('Email & Password')).toBeInTheDocument()
  })
})
