import { Platform } from 'react-native'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as WebBrowser from 'expo-web-browser'
import * as Crypto from 'expo-crypto'
import { signInWithCredential, OAuthProvider, GoogleAuthProvider } from 'firebase/auth'

import {
  signInWithApple,
  completeAppleSignInFromCallback,
  signInWithGoogleCredential,
} from '../../lib/auth'

jest.mock('firebase/auth', () => {
  const credentialFn = jest.fn((opts: { idToken: string; rawNonce: string }) => ({
    __apple_credential: true,
    ...opts,
  }))
  return {
    OAuthProvider: jest.fn().mockImplementation(() => ({ credential: credentialFn })),
    GoogleAuthProvider: { credential: jest.fn() },
    signInWithCredential: jest.fn(() => Promise.resolve({ user: { uid: 'u-1' } })),
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  }
})

jest.mock('../../lib/firebase', () => ({ auth: { __auth: true } }))

jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 'name', EMAIL: 'email' },
}))

jest.mock('expo-auth-session', () => ({
  AuthRequest: jest.fn(),
  ResponseType: { IdToken: 'id_token', Token: 'token' },
  makeRedirectUri: jest.fn(() => 'ctt://redirect'),
}))

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}))

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(async (_alg: string, raw: string) => `hashed-${raw}`),
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
}))

const mockSignInWithCredential = signInWithCredential as jest.MockedFunction<
  typeof signInWithCredential
>
const mockOAuthProvider = OAuthProvider as jest.MockedClass<typeof OAuthProvider>
const mockSignInAsync = AppleAuthentication.signInAsync as jest.MockedFunction<
  typeof AppleAuthentication.signInAsync
>
const mockOpenAuthSessionAsync = WebBrowser.openAuthSessionAsync as jest.MockedFunction<
  typeof WebBrowser.openAuthSessionAsync
>
const mockDigestStringAsync = Crypto.digestStringAsync as jest.MockedFunction<
  typeof Crypto.digestStringAsync
>

describe('signInWithGoogleCredential', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('builds a Google credential from the id token and signs into Firebase', async () => {
    ;(GoogleAuthProvider.credential as jest.Mock).mockReturnValueOnce({
      __google_credential: true,
    })

    await signInWithGoogleCredential('google-id-token')

    expect(GoogleAuthProvider.credential).toHaveBeenCalledWith('google-id-token')
    expect(signInWithCredential).toHaveBeenCalledWith(
      { __auth: true },
      { __google_credential: true },
    )
  })
})

describe('signInWithApple', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('iOS', () => {
    beforeAll(() => {
      Platform.OS = 'ios'
    })

    it('uses the native Apple Authentication sheet and signs into Firebase', async () => {
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'apple-id-token',
        user: 'apple-user-1',
        email: 'a@b.com',
        fullName: null,
        authorizationCode: null,
        realUserStatus: 0,
        state: null,
      })

      await signInWithApple()

      expect(mockSignInAsync).toHaveBeenCalledTimes(1)
      const callArgs = mockSignInAsync.mock.calls[0][0]!
      // Native flow passes the SHA256-hashed nonce, not the raw one
      expect(callArgs.nonce).toMatch(/^hashed-/)

      // Firebase credential is built with the id_token and the RAW nonce
      const providerInstance = mockOAuthProvider.mock.results[0].value as {
        credential: jest.Mock
      }
      expect(providerInstance.credential).toHaveBeenCalledWith({
        idToken: 'apple-id-token',
        rawNonce: expect.not.stringMatching(/^hashed-/),
      })
      expect(mockSignInWithCredential).toHaveBeenCalledTimes(1)
      expect(mockOpenAuthSessionAsync).not.toHaveBeenCalled()
    })
  })

  describe('Android', () => {
    beforeAll(() => {
      Platform.OS = 'android'
    })

    afterAll(() => {
      Platform.OS = 'ios'
    })

    it('opens the in-app Apple OAuth flow via the web bridge and signs into Firebase when WebBrowser captures the URL', async () => {
      // Capture the auth URL to assert on its OAuth params
      mockOpenAuthSessionAsync.mockImplementationOnce(async (authUrl) => {
        const url = new URL(authUrl)
        const state = url.searchParams.get('state')!
        return {
          type: 'success',
          url: `ctt://apple-callback?id_token=android-id-token&code=apple-code&state=${state}`,
        }
      })

      await signInWithApple()

      expect(mockOpenAuthSessionAsync).toHaveBeenCalledTimes(1)
      const [authUrl, returnUrl] = mockOpenAuthSessionAsync.mock.calls[0]
      expect(returnUrl).toBe('ctt://apple-callback')

      // Assert the OAuth params Apple needs for form_post + scoped sign-in
      const url = new URL(authUrl)
      expect(url.origin + url.pathname).toBe('https://appleid.apple.com/auth/authorize')
      expect(url.searchParams.get('client_id')).toBe('com.chicagotransittracker.web')
      expect(url.searchParams.get('redirect_uri')).toBe(
        'https://chicagotransittracker.com/api/apple-redirect',
      )
      expect(url.searchParams.get('response_type')).toBe('code id_token')
      expect(url.searchParams.get('response_mode')).toBe('form_post')
      expect(url.searchParams.get('scope')).toBe('name email')
      expect(url.searchParams.get('nonce')).toMatch(/^hashed-/)
      expect(url.searchParams.get('state')).toBeTruthy()

      // Firebase credential built from the id_token returned in the deep-link query string
      const providerInstance = mockOAuthProvider.mock.results[0].value as {
        credential: jest.Mock
      }
      expect(providerInstance.credential).toHaveBeenCalledWith({
        idToken: 'android-id-token',
        rawNonce: expect.not.stringMatching(/^hashed-/),
      })
      expect(mockSignInWithCredential).toHaveBeenCalledTimes(1)
      expect(mockSignInAsync).not.toHaveBeenCalled()
    })

    it('completes auth via completeAppleSignInFromCallback when the route fires before WebBrowser settles', async () => {
      jest.useFakeTimers()
      // Simulate the Android-intent path: WebBrowser is still open while the
      // expo-router route fires completeAppleSignInFromCallback. The route
      // wins; WebBrowser later resolves with a non-success result and is a
      // no-op.
      let resolveBrowser: (value: { type: 'cancel' }) => void = () => {}
      mockOpenAuthSessionAsync.mockImplementationOnce(
        () =>
          new Promise((res) => {
            resolveBrowser = res
          }),
      )

      const signInPromise = signInWithApple()
      // Wait a microtask to let signInWithApple set up pendingApple
      await Promise.resolve()
      await Promise.resolve()

      // Pull the state value the auth flow generated so the callback can echo it back
      const authUrlArg = mockOpenAuthSessionAsync.mock.calls[0][0]
      const state = new URL(authUrlArg).searchParams.get('state')!

      // Route fires with the Apple response
      await completeAppleSignInFromCallback({
        id_token: 'route-id-token',
        code: 'apple-code',
        state,
      })

      // Browser later closes without a captured URL — should be a no-op since the
      // route already resolved the pending sign-in. Advance past the 1500ms
      // cancel timeout to confirm it doesn't fire a second rejection.
      resolveBrowser({ type: 'cancel' })
      await Promise.resolve()
      jest.advanceTimersByTime(1500)

      await signInPromise
      expect(mockSignInWithCredential).toHaveBeenCalledTimes(1)
      const providerInstance = mockOAuthProvider.mock.results[0].value as {
        credential: jest.Mock
      }
      expect(providerInstance.credential).toHaveBeenCalledWith({
        idToken: 'route-id-token',
        rawNonce: expect.not.stringMatching(/^hashed-/),
      })
      jest.useRealTimers()
    })

    it('rejects with cancel when WebBrowser closes without a URL and the route never fires', async () => {
      jest.useFakeTimers()
      mockOpenAuthSessionAsync.mockResolvedValueOnce({ type: 'cancel' })
      const promise = signInWithApple()
      // Let the .then handler run, scheduling the 1500ms timeout
      await Promise.resolve()
      await Promise.resolve()
      jest.advanceTimersByTime(1500)
      await expect(promise).rejects.toThrow(/cancelled or failed/i)
      expect(mockSignInWithCredential).not.toHaveBeenCalled()
      jest.useRealTimers()
    })

    it('rejects when Apple returns no id_token', async () => {
      mockOpenAuthSessionAsync.mockImplementationOnce(async (authUrl) => {
        const url = new URL(authUrl)
        const state = url.searchParams.get('state')!
        return {
          type: 'success',
          url: `ctt://apple-callback?code=just-a-code&state=${state}`,
        }
      })
      await expect(signInWithApple()).rejects.toThrow(/did not return an id_token/i)
      expect(mockSignInWithCredential).not.toHaveBeenCalled()
    })

    it('rejects when the returned state does not match what was sent', async () => {
      mockOpenAuthSessionAsync.mockResolvedValueOnce({
        type: 'success',
        url: 'ctt://apple-callback?id_token=t&state=tampered',
      })
      await expect(signInWithApple()).rejects.toThrow(/state mismatch/i)
      expect(mockSignInWithCredential).not.toHaveBeenCalled()
    })

    it('hashes the nonce with SHA-256 before sending to Apple', async () => {
      mockOpenAuthSessionAsync.mockImplementationOnce(async (authUrl) => {
        const url = new URL(authUrl)
        const state = url.searchParams.get('state')!
        return {
          type: 'success',
          url: `ctt://apple-callback?id_token=t&state=${state}`,
        }
      })
      await signInWithApple()
      expect(mockDigestStringAsync).toHaveBeenCalledWith(
        'SHA256',
        expect.stringMatching(/^[a-z0-9]+$/),
      )
    })

    it('completeAppleSignInFromCallback is a no-op when no sign-in is pending', async () => {
      await expect(
        completeAppleSignInFromCallback({ id_token: 't', state: 's' }),
      ).resolves.toBeUndefined()
      expect(mockSignInWithCredential).not.toHaveBeenCalled()
    })
  })
})
