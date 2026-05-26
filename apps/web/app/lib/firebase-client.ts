import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { type Analytics, getAnalytics, isSupported } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: 'AIzaSyAXaI8xTzom3J_ZUIET1LkV2mxUEc9gkhE',
  authDomain: 'chicago-transit-tracker.firebaseapp.com',
  projectId: 'chicago-transit-tracker',
  storageBucket: 'chicago-transit-tracker.firebasestorage.app',
  messagingSenderId: '591975765807',
  appId: '1:591975765807:web:7a48b7de39a312be8b33da',
  measurementId: 'G-YZTP3F4Y9E',
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const auth = getAuth(app)
export const db = getFirestore(app)

let analyticsInstance: Analytics | null = null
let analyticsPromise: Promise<Analytics | null> | null = null

export function getAnalyticsClient(): Promise<Analytics | null> {
  if (analyticsInstance) return Promise.resolve(analyticsInstance)
  if (analyticsPromise) return analyticsPromise
  if (typeof window === 'undefined') return Promise.resolve(null)

  analyticsPromise = isSupported()
    .then((supported) => {
      if (!supported) return null
      analyticsInstance = getAnalytics(app)
      return analyticsInstance
    })
    .catch(() => null)
  return analyticsPromise
}
