const mockLogEvent = jest.fn(() => Promise.resolve())
const mockLogScreenView = jest.fn(() => Promise.resolve())
const mockSetUserId = jest.fn(() => Promise.resolve())
const mockSetUserProperty = jest.fn(() => Promise.resolve())
const mockSetAnalyticsCollectionEnabled = jest.fn(() => Promise.resolve())

jest.mock('@react-native-firebase/analytics', () => ({
  __esModule: true,
  default: () => ({
    logEvent: mockLogEvent,
    logScreenView: mockLogScreenView,
    setUserId: mockSetUserId,
    setUserProperty: mockSetUserProperty,
    setAnalyticsCollectionEnabled: mockSetAnalyticsCollectionEnabled,
  }),
}))

type Wrapper = typeof import('../../lib/analytics')

function loadWrapper(): Wrapper {
  let mod!: Wrapper
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('../../lib/analytics') as Wrapper
  })
  return mod
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('mobile analytics wrapper', () => {
  it('enables analytics collection on first load (idempotent)', async () => {
    const { trackEvent } = loadWrapper()
    await trackEvent('sign_up', { method: 'apple' })
    await trackEvent('login', { method: 'apple' })
    expect(mockSetAnalyticsCollectionEnabled).toHaveBeenCalledTimes(1)
    expect(mockSetAnalyticsCollectionEnabled).toHaveBeenCalledWith(true)
  })

  it('trackEvent forwards name and params to logEvent', async () => {
    const { trackEvent } = loadWrapper()
    await trackEvent('dashboard_item_added', { item_type: 'line', item_id: 'red' })
    expect(mockLogEvent).toHaveBeenCalledWith('dashboard_item_added', {
      item_type: 'line',
      item_id: 'red',
    })
  })

  it('trackScreenView forwards screen_name + screen_class', async () => {
    const { trackScreenView } = loadWrapper()
    await trackScreenView({ screen_name: '/cta/red', screen_class: '/cta/red' })
    expect(mockLogScreenView).toHaveBeenCalledWith({
      screen_name: '/cta/red',
      screen_class: '/cta/red',
    })
  })

  it('setUser forwards uid (and null) to setUserId', async () => {
    const { setUser } = loadWrapper()
    await setUser('uid-1')
    await setUser(null)
    expect(mockSetUserId).toHaveBeenNthCalledWith(1, 'uid-1')
    expect(mockSetUserId).toHaveBeenNthCalledWith(2, null)
  })

  it('setUserProperty forwards name + value', async () => {
    const { setUserProperty } = loadWrapper()
    await setUserProperty('auth_provider', 'google')
    expect(mockSetUserProperty).toHaveBeenCalledWith('auth_provider', 'google')
  })

  it('swallows logEvent failures so user flow is never broken', async () => {
    mockLogEvent.mockRejectedValueOnce(new Error('native crashed'))
    const { trackEvent } = loadWrapper()
    await expect(trackEvent('logout', {})).resolves.toBeUndefined()
  })
})

describe('mobile analytics wrapper when the native module is missing', () => {
  it('no-ops every call without throwing', async () => {
    let mod!: Wrapper
    jest.isolateModules(() => {
      jest.doMock('@react-native-firebase/analytics', () => ({
        __esModule: true,
        default: () => {
          throw new Error('native module unavailable')
        },
      }))
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mod = require('../../lib/analytics') as Wrapper
    })
    await expect(mod.trackEvent('logout', {})).resolves.toBeUndefined()
    await expect(mod.trackScreenView({ screen_name: '/' })).resolves.toBeUndefined()
    await expect(mod.setUser('uid-1')).resolves.toBeUndefined()
    await expect(mod.setUserProperty('auth_provider', 'apple')).resolves.toBeUndefined()
  })
})
