import {
  mockAuth,
  mockSignInWithEmailAndPassword,
  mockCreateUserWithEmailAndPassword,
  mockSignOut,
  mockSendPasswordResetEmail,
  mockSignInWithPopup,
} from '../mocks/firebase-auth'

import {
  signInWithEmail,
  signUpWithEmail,
  signOut,
  resetPassword,
  signInWithGoogle,
  signInWithApple,
  signInWithFacebook,
} from '../../app/lib/auth'

describe('auth helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('signInWithEmail calls signInWithEmailAndPassword', async () => {
    mockSignInWithEmailAndPassword.mockResolvedValue({ user: { uid: '123' } })
    await signInWithEmail('test@example.com', 'password123')
    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
      mockAuth,
      'test@example.com',
      'password123',
    )
  })

  it('signUpWithEmail calls createUserWithEmailAndPassword', async () => {
    mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: { uid: '123' } })
    await signUpWithEmail('test@example.com', 'password123')
    expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
      mockAuth,
      'test@example.com',
      'password123',
    )
  })

  it('signOut calls firebase signOut', async () => {
    mockSignOut.mockResolvedValue(undefined)
    await signOut()
    expect(mockSignOut).toHaveBeenCalledWith(mockAuth)
  })

  it('resetPassword calls sendPasswordResetEmail', async () => {
    mockSendPasswordResetEmail.mockResolvedValue(undefined)
    await resetPassword('test@example.com')
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(mockAuth, 'test@example.com')
  })

  it('signInWithGoogle calls signInWithPopup with GoogleAuthProvider', async () => {
    mockSignInWithPopup.mockResolvedValue({ user: { uid: '123' } })
    await signInWithGoogle()
    expect(mockSignInWithPopup).toHaveBeenCalledWith(mockAuth, expect.anything())
  })

  it('signInWithApple calls signInWithPopup with OAuthProvider', async () => {
    mockSignInWithPopup.mockResolvedValue({ user: { uid: '123' } })
    await signInWithApple()
    expect(mockSignInWithPopup).toHaveBeenCalledWith(mockAuth, expect.anything())
  })

  it('signInWithFacebook calls signInWithPopup with FacebookAuthProvider', async () => {
    mockSignInWithPopup.mockResolvedValue({ user: { uid: '123' } })
    await signInWithFacebook()
    expect(mockSignInWithPopup).toHaveBeenCalledWith(mockAuth, expect.anything())
  })
})
