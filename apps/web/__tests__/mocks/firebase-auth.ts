import type { User } from 'firebase/auth'

export const mockUser: Partial<User> = {
  uid: 'test-uid-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  providerData: [
    {
      providerId: 'password',
      uid: 'test@example.com',
      displayName: 'Test User',
      email: 'test@example.com',
      phoneNumber: null,
      photoURL: null,
    },
  ],
}

export const mockSignInWithEmailAndPassword = jest.fn()
export const mockCreateUserWithEmailAndPassword = jest.fn()
export const mockSignOut = jest.fn()
export const mockSendPasswordResetEmail = jest.fn()
export const mockSignInWithPopup = jest.fn()
export const mockOnAuthStateChanged = jest.fn()

export const mockAuth = { currentUser: null }

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => mockAuth),
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: (...args: unknown[]) =>
    mockCreateUserWithEmailAndPassword(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  sendPasswordResetEmail: (...args: unknown[]) => mockSendPasswordResetEmail(...args),
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
  GoogleAuthProvider: jest.fn(),
  OAuthProvider: jest.fn(() => ({ credential: jest.fn() })),
  FacebookAuthProvider: jest.fn(),
}))

jest.mock('../../app/lib/firebase-client', () => ({
  auth: mockAuth,
  db: {},
}))
