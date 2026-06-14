import AsyncStorage from '@react-native-async-storage/async-storage'
import type {
  AnalyticsEventName,
  AnalyticsEventParams,
  AnalyticsUserProperty,
  AnalyticsUserPropertyValueMap,
} from '@ctt/shared'

const MEASUREMENT_ID = 'G-KQ1MNGBQP2'
const API_SECRET = process.env.EXPO_PUBLIC_GA4_API_SECRET ?? ''
const MP_ENDPOINT = `https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`
const CLIENT_ID_KEY = '@ctt/ga4_client_id'

let clientId: string | null = null
let userId: string | null = null
const userProperties: Record<string, { value: string }> = {}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

async function getClientId(): Promise<string> {
  if (clientId) return clientId
  const stored = await AsyncStorage.getItem(CLIENT_ID_KEY)
  if (stored) {
    clientId = stored
    return clientId
  }
  const newId = generateUUID()
  await AsyncStorage.setItem(CLIENT_ID_KEY, newId)
  clientId = newId
  return clientId
}

async function post(name: string, params: Record<string, unknown> = {}): Promise<void> {
  if (!API_SECRET) return
  const cid = await getClientId()
  const body: Record<string, unknown> = {
    client_id: cid,
    events: [{ name, params }],
  }
  if (userId) body.user_id = userId
  if (Object.keys(userProperties).length > 0) body.user_properties = { ...userProperties }
  await fetch(MP_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function trackEvent<E extends AnalyticsEventName>(
  name: E,
  params: AnalyticsEventParams<E>,
): Promise<void> {
  try {
    await post(name as string, params as Record<string, unknown>)
  } catch {
    // Swallow analytics failures — they must never break the user flow.
  }
}

export async function trackScreenView(params: {
  screen_name: string
  screen_class?: string
}): Promise<void> {
  try {
    await post('screen_view', params as Record<string, unknown>)
  } catch {
    // Swallow.
  }
}

export async function setUser(uid: string | null): Promise<void> {
  userId = uid
}

export async function setUserProperty<P extends AnalyticsUserProperty>(
  name: P,
  value: AnalyticsUserPropertyValueMap[P],
): Promise<void> {
  if (value === null) {
    delete userProperties[name as string]
  } else {
    userProperties[name as string] = { value: value as string }
  }
}
