import { render, screen, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { mockOnAuthStateChanged, mockUser } from '../mocks/firebase-auth'

const mockGetDoc = jest.fn(() => Promise.resolve({ exists: () => false }))
const mockSetDoc = jest.fn(() => Promise.resolve())
const mockOnSnapshot = jest.fn()

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn((...args) => mockGetDoc(...args)),
  setDoc: jest.fn((...args) => mockSetDoc(...args)),
  onSnapshot: jest.fn((...args) => mockOnSnapshot(...args)),
  serverTimestamp: jest.fn(() => 'mock-timestamp'),
  getFirestore: jest.fn(),
}))

const mockHydrate = jest.fn()
const mockClear = jest.fn()
jest.mock('@lib/store/favorites', () => ({
  useFavoritesStore: {
    getState: () => ({ hydrate: mockHydrate, clear: mockClear }),
  },
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
      <span data-testid="favorites-count">{profile?.favorites?.length ?? 0}</span>
    </div>
  )
}

type SnapshotCallback = (snap: { exists: () => boolean; data: () => unknown }) => void

function captureSnapshotCallback() {
  let cb: SnapshotCallback | null = null
  mockOnSnapshot.mockImplementation((_ref, next) => {
    cb = next
    return jest.fn()
  })
  return () => {
    if (!cb) throw new Error('snapshot callback not captured')
    return cb
  }
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

  it('shows not signed in and clears the favorites store when user is null', async () => {
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
    expect(mockClear).toHaveBeenCalled()
  })

  it('creates a new profile with empty favorites map for first-time sign-in', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false })
    mockSetDoc.mockResolvedValue(undefined)
    const getCb = captureSnapshotCallback()

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
      expect(mockSetDoc).toHaveBeenCalled()
    })
    expect(mockSetDoc.mock.calls[0][1]).toMatchObject({
      uid: 'test-uid-123',
      favorites: {},
    })

    // simulate the snapshot fire after setDoc
    act(() => {
      getCb()({
        exists: () => true,
        data: () => ({
          uid: 'test-uid-123',
          email: 'test@example.com',
          displayName: 'Test User',
          photoUrl: null,
          provider: 'password',
          favorites: {},
          createdAt: '2026-04-25T00:00:00Z',
          updatedAt: '2026-04-25T00:00:00Z',
        }),
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId('email')).toHaveTextContent('test@example.com')
    })
    expect(mockHydrate).toHaveBeenCalledWith([])
  })

  it('hydrates favorites into the Zustand store on snapshot', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true })
    const getCb = captureSnapshotCallback()

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
      expect(mockOnSnapshot).toHaveBeenCalled()
    })

    act(() => {
      getCb()({
        exists: () => true,
        data: () => ({
          uid: 'test-uid-123',
          email: 'test@example.com',
          displayName: 'Test User',
          photoUrl: null,
          provider: 'password',
          favorites: {
            'line:red': { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' },
            'station:clark-lake': {
              type: 'station',
              id: 'clark-lake',
              addedAt: '2026-04-25T11:00:00Z',
            },
          },
          createdAt: '2026-04-25T00:00:00Z',
          updatedAt: '2026-04-25T00:00:00Z',
        }),
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId('favorites-count')).toHaveTextContent('2')
    })
    expect(mockSetDoc).not.toHaveBeenCalled()
    expect(mockHydrate).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'clark-lake' }),
      expect.objectContaining({ id: 'red' }),
    ])
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

    await waitFor(() => {
      expect(screen.getByTestId('uid')).toHaveTextContent('test-uid-123')
      expect(screen.getByTestId('email')).toHaveTextContent('')
    })
    expect(consoleSpy).toHaveBeenCalledWith('Failed to load/create profile:', expect.any(Error))
    consoleSpy.mockRestore()
  })

  it('cleans up auth listener and profile subscription on unmount', async () => {
    const authUnsub = jest.fn()
    const profileUnsub = jest.fn()
    mockGetDoc.mockResolvedValue({ exists: () => true })
    mockOnSnapshot.mockReturnValue(profileUnsub)

    mockOnAuthStateChanged.mockImplementation((_, callback) => {
      callback(mockUser)
      return authUnsub
    })

    const { unmount } = render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(mockOnSnapshot).toHaveBeenCalled()
    })

    unmount()
    expect(authUnsub).toHaveBeenCalled()
    expect(profileUnsub).toHaveBeenCalled()
  })
})
