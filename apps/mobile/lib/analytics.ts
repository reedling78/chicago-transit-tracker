import analytics from '@react-native-firebase/analytics'
import type {
  AnalyticsEventName,
  AnalyticsEventParams,
  AnalyticsUserProperty,
  AnalyticsUserPropertyValueMap,
} from '@ctt/shared'

let initialized = false

interface FirebaseAnalyticsInstance {
  logEvent: (name: string, params?: Record<string, unknown>) => Promise<void>
  logScreenView: (params: { screen_name?: string; screen_class?: string }) => Promise<void>
  setUserId: (uid: string | null) => Promise<void>
  setUserProperty: (name: string, value: string | null) => Promise<void>
  setAnalyticsCollectionEnabled: (enabled: boolean) => Promise<void>
}

function getInstance(): FirebaseAnalyticsInstance | null {
  try {
    const instance = analytics() as unknown as FirebaseAnalyticsInstance
    if (!initialized) {
      initialized = true
      // GoogleService-Info.plist ships with IS_ANALYTICS_ENABLED=false on
      // iOS; flip the runtime switch so collection actually happens. Idempotent
      // and safe on Android.
      void instance.setAnalyticsCollectionEnabled(true)
    }
    return instance
  } catch {
    // Native module unavailable (Jest, Expo Go without dev client, etc.).
    return null
  }
}

export async function trackEvent<E extends AnalyticsEventName>(
  name: E,
  params: AnalyticsEventParams<E>,
): Promise<void> {
  const a = getInstance()
  if (!a) return
  try {
    await a.logEvent(name as string, params as Record<string, unknown>)
  } catch {
    // Swallow analytics failures — they must never break the user flow.
  }
}

export async function trackScreenView(params: {
  screen_name: string
  screen_class?: string
}): Promise<void> {
  const a = getInstance()
  if (!a) return
  try {
    await a.logScreenView(params)
  } catch {
    // Swallow.
  }
}

export async function setUser(uid: string | null): Promise<void> {
  const a = getInstance()
  if (!a) return
  try {
    await a.setUserId(uid)
  } catch {
    // Swallow.
  }
}

export async function setUserProperty<P extends AnalyticsUserProperty>(
  name: P,
  value: AnalyticsUserPropertyValueMap[P],
): Promise<void> {
  const a = getInstance()
  if (!a) return
  try {
    await a.setUserProperty(name as string, value)
  } catch {
    // Swallow.
  }
}
