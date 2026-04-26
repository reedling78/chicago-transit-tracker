import { render, waitFor, act } from '@testing-library/react-native'
import { Text } from 'react-native'
import { onAuthStateChanged } from 'firebase/auth'
import { getDoc, setDoc, onSnapshot } from 'firebase/firestore'

import { AuthProvider, useAuth } from '../../lib/AuthContext'

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
  getAuth: jest.fn(),
  initializeAuth: jest.fn(),
  getReactNativePersistence: jest.fn(),
}))

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db, coll: string, id: string) => ({ __doc: { coll, id } })),
  getDoc: jest.fn(),
  setDoc: jest.fn(() => Promise.resolve()),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(() => 'mock-timestamp'),
  getFirestore: jest.fn(),
}))

jest.mock('../../lib/firebase', () => ({ auth: {}, db: {} }))

const mockHydrate = jest.fn()
const mockClear = jest.fn()
let mockPendingWrites = 0
jest.mock('../../lib/store/favorites', () => ({
  useFavoritesStore: {
    getState: () => ({
      hydrate: mockHydrate,
      clear: mockClear,
      pendingWrites: mockPendingWrites,
    }),
  },
}))

const mockOnAuthStateChanged = onAuthStateChanged as jest.MockedFunction<typeof onAuthStateChanged>
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>
const mockSetDoc = setDoc as jest.MockedFunction<typeof setDoc>
const mockOnSnapshot = onSnapshot as jest.MockedFunction<typeof onSnapshot>

const mockUser = {
  uid: 'test-uid-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  providerData: [{ providerId: 'password' }],
} as never

function Probe() {
  const { user, profile, loading } = useAuth()
  if (loading) return <Text testID="state">loading</Text>
  if (!user) return <Text testID="state">signed-out</Text>
  return <Text testID="state">{`signed-in:${profile?.favorites?.length ?? 0}`}</Text>
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPendingWrites = 0
})

describe('AuthProvider (mobile)', () => {
  it('clears favorites and shows signed-out when user is null', async () => {
    mockOnAuthStateChanged.mockImplementation((_, cb) => {
      ;(cb as (u: unknown) => void)(null)
      return jest.fn()
    })
    const { getByTestId } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => {
      expect(getByTestId('state').props.children).toBe('signed-out')
    })
    expect(mockClear).toHaveBeenCalled()
  })

  it('creates a profile with empty favorites map for first-time sign-in', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false } as never)
    let snapshotCb: ((s: unknown) => void) | undefined
    mockOnSnapshot.mockImplementation((_ref, next) => {
      snapshotCb = next as (s: unknown) => void
      return jest.fn()
    })
    mockOnAuthStateChanged.mockImplementation((_, cb) => {
      ;(cb as (u: unknown) => void)(mockUser)
      return jest.fn()
    })

    const { getByTestId } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(mockSetDoc).toHaveBeenCalled()
    })
    expect(mockSetDoc.mock.calls[0][1]).toMatchObject({ favorites: {} })

    act(() => {
      snapshotCb?.({
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
      expect(getByTestId('state').props.children).toBe('signed-in:0')
    })
    expect(mockHydrate).toHaveBeenCalledWith([])
  })

  it('hydrates favorites into the Zustand store on snapshot', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true } as never)
    let snapshotCb: ((s: unknown) => void) | undefined
    mockOnSnapshot.mockImplementation((_ref, next) => {
      snapshotCb = next as (s: unknown) => void
      return jest.fn()
    })
    mockOnAuthStateChanged.mockImplementation((_, cb) => {
      ;(cb as (u: unknown) => void)(mockUser)
      return jest.fn()
    })

    const { getByTestId } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(mockOnSnapshot).toHaveBeenCalled()
    })

    act(() => {
      snapshotCb?.({
        exists: () => true,
        data: () => ({
          uid: 'test-uid-123',
          email: 'test@example.com',
          displayName: 'Test User',
          photoUrl: null,
          provider: 'password',
          favorites: {
            'line:red': { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' },
            'train:bnsf_1234': {
              type: 'train',
              id: 'bnsf_1234',
              addedAt: '2026-04-25T11:00:00Z',
            },
          },
          createdAt: '2026-04-25T00:00:00Z',
          updatedAt: '2026-04-25T00:00:00Z',
        }),
      })
    })

    await waitFor(() => {
      expect(getByTestId('state').props.children).toBe('signed-in:2')
    })
    expect(mockHydrate).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'bnsf_1234' }),
      expect.objectContaining({ id: 'red' }),
    ])
    expect(mockSetDoc).not.toHaveBeenCalled()
  })

  it('skips hydrate when pendingWrites > 0 (concurrency guard)', async () => {
    mockPendingWrites = 1
    mockGetDoc.mockResolvedValue({ exists: () => true } as never)
    let snapshotCb: ((s: unknown) => void) | undefined
    mockOnSnapshot.mockImplementation((_ref, next) => {
      snapshotCb = next as (s: unknown) => void
      return jest.fn()
    })
    mockOnAuthStateChanged.mockImplementation((_, cb) => {
      ;(cb as (u: unknown) => void)(mockUser)
      return jest.fn()
    })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(mockOnSnapshot).toHaveBeenCalled()
    })

    act(() => {
      snapshotCb?.({
        exists: () => true,
        data: () => ({
          uid: 'test-uid-123',
          email: 'test@example.com',
          displayName: 'Test User',
          photoUrl: null,
          provider: 'password',
          favorites: {
            'line:red': { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' },
          },
          createdAt: '2026-04-25T00:00:00Z',
          updatedAt: '2026-04-25T00:00:00Z',
        }),
      })
    })

    expect(mockHydrate).not.toHaveBeenCalled()
  })

  it('cleans up auth listener and profile subscription on unmount', async () => {
    const authUnsub = jest.fn()
    const profileUnsub = jest.fn()
    mockGetDoc.mockResolvedValue({ exists: () => true } as never)
    mockOnSnapshot.mockReturnValue(profileUnsub)
    mockOnAuthStateChanged.mockImplementation((_, cb) => {
      ;(cb as (u: unknown) => void)(mockUser)
      return authUnsub
    })

    const { unmount } = render(
      <AuthProvider>
        <Probe />
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
