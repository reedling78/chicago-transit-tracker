import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
} from 'firebase/auth'
import { auth } from './firebase-client'
import { trackEvent } from './analytics'

export function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password)
}

export function signUpWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password)
}

export function signOut() {
  void trackEvent('logout', {})
  return firebaseSignOut(auth)
}

export function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email)
}

export function signInWithGoogle() {
  return signInWithPopup(auth, new GoogleAuthProvider())
}

export function signInWithApple() {
  return signInWithPopup(auth, new OAuthProvider('apple.com'))
}
