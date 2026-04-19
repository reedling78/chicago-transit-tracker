import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  signInWithCredential,
  OAuthProvider,
  GoogleAuthProvider,
  FacebookAuthProvider,
} from 'firebase/auth'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import * as Crypto from 'expo-crypto'
import { auth } from './firebase'

WebBrowser.maybeCompleteAuthSession()

// Google OAuth client ID from Firebase Console — must be set before Google sign-in works
const GOOGLE_WEB_CLIENT_ID = '' // TODO: set from Firebase Console

function requireClientId(id: string, provider: string): string {
  if (!id)
    throw new Error(`${provider} client ID is not configured. Set it in apps/mobile/lib/auth.ts`)
  return id
}

export function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password)
}

export function signUpWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password)
}

export function signOut() {
  return firebaseSignOut(auth)
}

export function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email)
}

export async function signInWithApple() {
  const nonce = Math.random().toString(36).substring(2, 10)
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce)

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  })

  const oAuthCredential = new OAuthProvider('apple.com').credential({
    idToken: credential.identityToken!,
    rawNonce: nonce,
  })

  return signInWithCredential(auth, oAuthCredential)
}

export async function signInWithGoogle() {
  const redirectUri = AuthSession.makeRedirectUri()
  const discovery = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
  }

  const request = new AuthSession.AuthRequest({
    clientId: requireClientId(GOOGLE_WEB_CLIENT_ID, 'Google'),
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
    responseType: AuthSession.ResponseType.IdToken,
  })

  const result = await request.promptAsync(discovery)
  if (result.type !== 'success' || !result.params.id_token) {
    throw new Error('Google sign-in was cancelled or failed')
  }

  const credential = GoogleAuthProvider.credential(result.params.id_token)
  return signInWithCredential(auth, credential)
}

export async function signInWithFacebook() {
  const redirectUri = AuthSession.makeRedirectUri()
  const discovery = {
    authorizationEndpoint: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenEndpoint: 'https://graph.facebook.com/v19.0/oauth/access_token',
  }

  const FACEBOOK_APP_ID = '' // TODO: set from Facebook Developer Console

  const request = new AuthSession.AuthRequest({
    clientId: requireClientId(FACEBOOK_APP_ID, 'Facebook'),
    redirectUri,
    scopes: ['public_profile', 'email'],
    responseType: AuthSession.ResponseType.Token,
  })

  const result = await request.promptAsync(discovery)
  if (result.type !== 'success' || !result.params.access_token) {
    throw new Error('Facebook sign-in was cancelled or failed')
  }

  const credential = FacebookAuthProvider.credential(result.params.access_token)
  return signInWithCredential(auth, credential)
}
