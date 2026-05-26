import { logEvent, setUserId, setUserProperties } from 'firebase/analytics'
import type {
  AnalyticsEventName,
  AnalyticsEventParams,
  AnalyticsUserProperty,
  AnalyticsUserPropertyValueMap,
} from '@ctt/shared'
import { getAnalyticsClient } from './firebase-client'

export async function trackEvent<E extends AnalyticsEventName>(
  name: E,
  params: AnalyticsEventParams<E>,
): Promise<void> {
  const analytics = await getAnalyticsClient()
  if (!analytics) return
  logEvent(analytics, name as string, params as Record<string, unknown>)
}

export async function trackPageView(params: {
  page_path: string
  page_location?: string
  page_title?: string
}): Promise<void> {
  const analytics = await getAnalyticsClient()
  if (!analytics) return
  logEvent(analytics, 'page_view', params)
}

export async function setUser(uid: string | null): Promise<void> {
  const analytics = await getAnalyticsClient()
  if (!analytics) return
  setUserId(analytics, uid)
}

export async function setUserProperty<P extends AnalyticsUserProperty>(
  name: P,
  value: AnalyticsUserPropertyValueMap[P],
): Promise<void> {
  const analytics = await getAnalyticsClient()
  if (!analytics) return
  setUserProperties(analytics, { [name]: value })
}
