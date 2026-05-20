import { render, screen, fireEvent } from '@testing-library/react'
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

const mockClearAll = jest.fn()
jest.mock('../../app/lib/hooks/useClearAllDashboardItems', () => ({
  useClearAllDashboardItems: () => ({
    clearAll: mockClearAll,
    isClearing: false,
    needsAuth: false,
  }),
}))

import ProfileContent from '../../app/profile/ProfileContent'
import { useDashboardStore } from '../../app/lib/store/dashboard'

beforeEach(() => {
  mockClearAll.mockClear()
  useDashboardStore.setState({ items: [], hydrated: false, pendingWrites: 0 })
})

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
    expect(screen.queryByText('Clear all dashboard items')).not.toBeInTheDocument()
  })

  it('shows profile info and Clear all dashboard items button when authenticated', () => {
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
    expect(screen.getByText('Google')).toBeInTheDocument()
    expect(screen.getByText(/2026/)).toBeInTheDocument()
    expect(screen.getByText('Sign Out')).toBeInTheDocument()
    expect(screen.getByText('Clear all dashboard items')).toBeInTheDocument()
  })

  it('disables Clear all dashboard items when there are no items', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: '123' },
      profile: {
        uid: '123',
        email: 'test@example.com',
        displayName: null,
        photoUrl: null,
        provider: 'google',
        createdAt: '2026-01-15T00:00:00Z',
        updatedAt: '2026-01-15T00:00:00Z',
      },
      loading: false,
    })
    render(<ProfileContent />)
    expect(screen.getByText('Clear all dashboard items')).toBeDisabled()
  })

  it('calls clearAll after confirm when items exist', () => {
    useDashboardStore.setState({
      items: [{ type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }],
    })
    mockUseAuth.mockReturnValue({
      user: { uid: '123' },
      profile: {
        uid: '123',
        email: 'test@example.com',
        displayName: null,
        photoUrl: null,
        provider: 'google',
        createdAt: '2026-01-15T00:00:00Z',
        updatedAt: '2026-01-15T00:00:00Z',
      },
      loading: false,
    })
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ProfileContent />)
    fireEvent.click(screen.getByText('Clear all dashboard items'))
    expect(mockClearAll).toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('does not render the display name field', () => {
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
    expect(screen.queryByText('Display Name')).not.toBeInTheDocument()
    expect(screen.queryByText('Test User')).not.toBeInTheDocument()
  })
})
