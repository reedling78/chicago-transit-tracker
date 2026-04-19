import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { mockOnAuthStateChanged, mockUser } from '../mocks/firebase-auth'

const mockGetDoc = jest.fn(() => Promise.resolve({ exists: () => false }))
const mockSetDoc = jest.fn(() => Promise.resolve())

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn((...args) => mockGetDoc(...args)),
  setDoc: jest.fn((...args) => mockSetDoc(...args)),
  serverTimestamp: jest.fn(() => 'mock-timestamp'),
  getFirestore: jest.fn(),
}))

import AuthProvider, { useAuth } from '../../app/components/AuthProvider'

function AuthConsumer() {
  const { user, profile, loading } = useAuth()
  if (loading) return <div>Loading...</div>
  if (!user) return <div>Not signed in</div>
  return (
    <div>
      <span data-testid="email">{profile?.email}</span>
      <span data-testid="uid">{user.uid}</span>
    </div>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows loading state initially', () => {
    mockOnAuthStateChanged.mockImplementation(() => jest.fn())
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows not signed in when user is null', async () => {
    mockOnAuthStateChanged.mockImplementation((_, callback) => {
      callback(null)
      return jest.fn()
    })
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )
    await waitFor(() => {
      expect(screen.getByText('Not signed in')).toBeInTheDocument()
    })
  })

  it('provides user and creates profile when user signs in', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false })
    mockSetDoc.mockResolvedValue(undefined)

    mockOnAuthStateChanged.mockImplementation((_, callback) => {
      callback(mockUser)
      return jest.fn()
    })

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('email')).toHaveTextContent('test@example.com')
      expect(screen.getByTestId('uid')).toHaveTextContent('test-uid-123')
    })
    expect(mockSetDoc).toHaveBeenCalled()
  })

  it('loads existing profile without creating a new one', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoUrl: null,
        provider: 'password',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      }),
    })

    mockOnAuthStateChanged.mockImplementation((_, callback) => {
      callback(mockUser)
      return jest.fn()
    })

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('email')).toHaveTextContent('test@example.com')
    })
    expect(mockSetDoc).not.toHaveBeenCalled()
  })

  it('handles Firestore errors gracefully', async () => {
    mockGetDoc.mockRejectedValue(new Error('Network error'))
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    mockOnAuthStateChanged.mockImplementation((_, callback) => {
      callback(mockUser)
      return jest.fn()
    })

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    // User is still set from Firebase Auth, but profile is null due to Firestore error
    await waitFor(() => {
      expect(screen.getByTestId('uid')).toHaveTextContent('test-uid-123')
      expect(screen.getByTestId('email')).toHaveTextContent('')
    })
    expect(consoleSpy).toHaveBeenCalledWith('Failed to load/create profile:', expect.any(Error))
    consoleSpy.mockRestore()
  })

  it('cleans up auth listener on unmount', () => {
    const unsubscribe = jest.fn()
    mockOnAuthStateChanged.mockImplementation(() => unsubscribe)

    const { unmount } = render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )
    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })
})
