import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { mockOnAuthStateChanged, mockUser } from '../mocks/firebase-auth'

import { getDoc, setDoc } from 'firebase/firestore'

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false })),
  setDoc: jest.fn(() => Promise.resolve()),
  serverTimestamp: jest.fn(() => 'mock-timestamp'),
  getFirestore: jest.fn(),
}))

const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>
const mockSetDoc = setDoc as jest.MockedFunction<typeof setDoc>

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
    mockGetDoc.mockResolvedValue({ exists: () => false } as never)
    mockSetDoc.mockResolvedValue(undefined as never)

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
    expect(setDoc).toHaveBeenCalled()
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
    } as never)

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
    expect(setDoc).not.toHaveBeenCalled()
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
