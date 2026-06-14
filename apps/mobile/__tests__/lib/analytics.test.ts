import AsyncStorage from '@react-native-async-storage/async-storage'

const mockFetch = jest.fn(() => Promise.resolve({ ok: true } as Response))

beforeAll(() => {
  process.env.EXPO_PUBLIC_GA4_API_SECRET = 'test-secret'
  global.fetch = mockFetch
})

afterAll(() => {
  delete process.env.EXPO_PUBLIC_GA4_API_SECRET
})

beforeEach(async () => {
  jest.clearAllMocks()
  await AsyncStorage.clear()
})

type Wrapper = typeof import('../../lib/analytics')

function loadWrapper(): Wrapper {
  let mod!: Wrapper
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('../../lib/analytics') as Wrapper
  })
  return mod
}

function parsedBody(callIndex = 0): Record<string, unknown> {
  return JSON.parse(mockFetch.mock.calls[callIndex][1].body as string) as Record<string, unknown>
}

describe('mobile analytics wrapper', () => {
  it('trackEvent posts to GA4 Measurement Protocol with correct event', async () => {
    const { trackEvent } = loadWrapper()
    await trackEvent('dashboard_item_added', { item_type: 'line', item_id: 'red' })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const body = parsedBody()
    expect(body.events).toEqual([
      { name: 'dashboard_item_added', params: { item_type: 'line', item_id: 'red' } },
    ])
    expect(typeof body.client_id).toBe('string')
  })

  it('trackScreenView posts a screen_view event', async () => {
    const { trackScreenView } = loadWrapper()
    await trackScreenView({ screen_name: '/cta/red', screen_class: '/cta/red' })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const body = parsedBody()
    expect(body.events).toEqual([
      { name: 'screen_view', params: { screen_name: '/cta/red', screen_class: '/cta/red' } },
    ])
  })

  it('setUser includes user_id in subsequent events', async () => {
    const { trackEvent, setUser } = loadWrapper()
    await setUser('uid-1')
    await trackEvent('login', { method: 'apple' })
    expect(parsedBody().user_id).toBe('uid-1')
  })

  it('setUser(null) omits user_id from subsequent events', async () => {
    const { trackEvent, setUser } = loadWrapper()
    await setUser('uid-1')
    await setUser(null)
    await trackEvent('logout', {})
    expect(parsedBody().user_id).toBeUndefined()
  })

  it('setUserProperty includes user_properties in subsequent events', async () => {
    const { trackEvent, setUserProperty } = loadWrapper()
    await setUserProperty('auth_provider', 'google')
    await trackEvent('login', { method: 'google' })
    expect(parsedBody().user_properties).toEqual({ auth_provider: { value: 'google' } })
  })

  it('uses the same client_id across calls (persisted to AsyncStorage)', async () => {
    const { trackEvent } = loadWrapper()
    await trackEvent('login', { method: 'apple' })
    await trackEvent('logout', {})
    expect(parsedBody(0).client_id).toBe(parsedBody(1).client_id)
  })

  it('swallows fetch failures so user flow is never broken', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network error'))
    const { trackEvent } = loadWrapper()
    await expect(trackEvent('logout', {})).resolves.toBeUndefined()
  })
})

describe('mobile analytics wrapper when API_SECRET is missing', () => {
  it('no-ops every call without fetching', async () => {
    let mod!: Wrapper
    const savedSecret = process.env.EXPO_PUBLIC_GA4_API_SECRET
    delete process.env.EXPO_PUBLIC_GA4_API_SECRET
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mod = require('../../lib/analytics') as Wrapper
    })
    process.env.EXPO_PUBLIC_GA4_API_SECRET = savedSecret
    await expect(mod.trackEvent('logout', {})).resolves.toBeUndefined()
    await expect(mod.trackScreenView({ screen_name: '/' })).resolves.toBeUndefined()
    await expect(mod.setUser('uid-1')).resolves.toBeUndefined()
    await expect(mod.setUserProperty('auth_provider', 'apple')).resolves.toBeUndefined()
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
