import { Platform } from 'react-native'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  signInWithCredential,
  OAuthProvider,
  GoogleAuthProvider,
} from 'firebase/auth'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as WebBrowser from 'expo-web-browser'
import * as Crypto from 'expo-crypto'
import { auth } from './firebase'

WebBrowser.maybeCompleteAuthSession()

// Google OAuth client IDs. Created in Google Cloud Console → Credentials.
// See docs/superpowers/plans/2026-05-14-google-auth-setup.md for the setup steps.
//   - Web: auto-created when Google sign-in is enabled in Firebase Auth.
//          Required so the resulting id_token verifies against the Firebase project.
//   - iOS: bundle ID com.chicagotransittracker.app. Its reverse-DNS URL scheme
//          must also be listed under expo.ios.infoPlist.CFBundleURLTypes in app.json.
//   - Android: package com.chicagotransittracker.app + debug & release SHA-1 fingerprints.
const GOOGLE_WEB_CLIENT_ID =
  '591975765807-lb90qdlscfn8r1v48ercpvla5ifp8b0p.apps.googleusercontent.com'
const GOOGLE_IOS_CLIENT_ID =
  '591975765807-6pbc1mbpucbqch5jjb68lnpal0ldt6pv.apps.googleusercontent.com'
const GOOGLE_ANDROID_CLIENT_ID =
  '591975765807-9s6a5evq6pask1f67g7tpnjndqnde5en.apps.googleusercontent.com'

export const googleAuthConfig = {
  webClientId: GOOGLE_WEB_CLIENT_ID,
  iosClientId: GOOGLE_IOS_CLIENT_ID,
  androidClientId: GOOGLE_ANDROID_CLIENT_ID,
}

// Apple Sign in via web (Android / non-iOS). The Service ID is configured in
// the Apple Developer Console; the bridge URL is a Next.js POST endpoint
// that catches Apple's form_post response and bounces to the ctt:// deep link.
const APPLE_SERVICE_ID = 'com.chicagotransittracker.web'
const APPLE_BRIDGE_URL = 'https://chicagotransittracker.com/api/apple-redirect'
const APPLE_CALLBACK_SCHEME = 'ctt://apple-callback'

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

  if (Platform.OS === 'ios') {
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

  // Android (and any other non-iOS): Apple's web OAuth via the bridge endpoint.
  // Apple requires response_mode=form_post when scopes are requested, so the
  // bridge POST handler at /api/apple-redirect catches the response and
  // bounces it back to the app via the ctt:// deep link.
  //
  // The deep link can be received two ways depending on whether Android
  // intent-dispatches the URL or lets the in-app Custom Tab keep it:
  //   1. WebBrowser.openAuthSessionAsync intercepts via expo-linking
  //   2. Android opens the app with the URL, expo-router routes to
  //      app/apple-callback.tsx, which calls completeAppleSignInFromCallback
  // Both paths converge on completeAppleAuth() below; whichever fires first
  // wins and the second is a no-op.
  const state = Math.random().toString(36).substring(2, 18)
  return new Promise((resolve, reject) => {
    pendingApple = { rawNonce: nonce, state, resolve, reject, done: false }
    const params = new URLSearchParams({
      response_type: 'code id_token',
      response_mode: 'form_post',
      client_id: APPLE_SERVICE_ID,
      redirect_uri: APPLE_BRIDGE_URL,
      scope: 'name email',
      nonce: hashedNonce,
      state,
    })
    const authUrl = `https://appleid.apple.com/auth/authorize?${params.toString()}`

    WebBrowser.openAuthSessionAsync(authUrl, APPLE_CALLBACK_SCHEME)
      .then((result) => {
        if (result.type === 'success' && result.url) {
          const params = parseDeepLinkParams(result.url)
          completeAppleAuth(params).catch(() => {})
          return
        }
        // Browser closed without a captured URL. Give the deep-link route a
        // chance to fire (Android intent dispatch is racy with WebBrowser's
        // Linking listener); if nothing completes within ~1.5s, treat as
        // cancel.
        setTimeout(() => {
          const pending = pendingApple
          if (pending && !pending.done) {
            pendingApple = null
            pending.reject(new Error('Apple sign-in was cancelled or failed'))
          }
        }, 1500)
      })
      .catch((err) => {
        const pending = pendingApple
        if (pending && !pending.done) {
          pendingApple = null
          pending.reject(err)
        }
      })
  })
}

interface PendingApple {
  rawNonce: string
  state: string
  resolve: (cred: Awaited<ReturnType<typeof signInWithCredential>>) => void
  reject: (err: unknown) => void
  done: boolean
}

let pendingApple: PendingApple | null = null

function parseDeepLinkParams(url: string): Record<string, string> {
  const queryIdx = url.indexOf('?')
  const hashIdx = url.indexOf('#')
  const sep =
    queryIdx >= 0 && (hashIdx < 0 || queryIdx < hashIdx) ? queryIdx : hashIdx >= 0 ? hashIdx : -1
  if (sep < 0) return {}
  const params: Record<string, string> = {}
  new URLSearchParams(url.slice(sep + 1)).forEach((value, key) => {
    params[key] = value
  })
  return params
}

async function completeAppleAuth(params: Record<string, string | undefined>) {
  const pending = pendingApple
  if (!pending || pending.done) return
  pending.done = true
  pendingApple = null

  try {
    const idToken = params.id_token
    const returnedState = params.state
    if (!idToken) throw new Error('Apple sign-in did not return an id_token')
    if (returnedState !== pending.state) throw new Error('Apple sign-in state mismatch')

    const credential = new OAuthProvider('apple.com').credential({
      idToken,
      rawNonce: pending.rawNonce,
    })
    const result = await signInWithCredential(auth, credential)
    pending.resolve(result)
  } catch (err) {
    pending.reject(err)
  }
}

/**
 * Called by the apple-callback Expo Router screen when Android intent-dispatches
 * the bridge's deep link to the app instead of letting WebBrowser's listener
 * intercept it. No-op if no Apple sign-in is in flight.
 */
export function completeAppleSignInFromCallback(params: Record<string, string | undefined>) {
  return completeAppleAuth(params)
}

/**
 * Exchanges a Google ID token (obtained via Google.useAuthRequest in the sign-in
 * screen) for a Firebase user session. The OAuth flow itself lives in the
 * screen because expo-auth-session/providers/google is a hook.
 */
export function signInWithGoogleCredential(idToken: string) {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error('Google client IDs are not configured. Set them in apps/mobile/lib/auth.ts')
  }
  const credential = GoogleAuthProvider.credential(idToken)
  return signInWithCredential(auth, credential)
}
