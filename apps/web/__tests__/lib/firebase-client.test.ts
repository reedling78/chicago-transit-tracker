const mockIsSupported = jest.fn()
const mockGetAnalytics = jest.fn()

jest.mock('firebase/analytics', () => ({
  isSupported: (...args: unknown[]) => mockIsSupported(...args),
  getAnalytics: (...args: unknown[]) => mockGetAnalytics(...args),
}))

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({ __app: true })),
  getApps: jest.fn(() => []),
}))

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ __auth: true })),
}))

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({ __db: true })),
}))

async function loadClient() {
  jest.resetModules()
  return await import('../../app/lib/firebase-client')
}

describe('firebase-client getAnalyticsClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns null when the browser environment is unsupported', async () => {
    mockIsSupported.mockResolvedValue(false)
    const { getAnalyticsClient } = await loadClient()
    await expect(getAnalyticsClient()).resolves.toBeNull()
    expect(mockGetAnalytics).not.toHaveBeenCalled()
  })

  it('initializes analytics once when supported and reuses it', async () => {
    mockIsSupported.mockResolvedValue(true)
    const fakeAnalytics = { __analytics: true }
    mockGetAnalytics.mockReturnValue(fakeAnalytics)
    const { getAnalyticsClient } = await loadClient()
    const first = await getAnalyticsClient()
    const second = await getAnalyticsClient()
    expect(first).toBe(fakeAnalytics)
    expect(second).toBe(fakeAnalytics)
    expect(mockGetAnalytics).toHaveBeenCalledTimes(1)
  })

  it('swallows isSupported rejections and returns null', async () => {
    mockIsSupported.mockRejectedValue(new Error('boom'))
    const { getAnalyticsClient } = await loadClient()
    await expect(getAnalyticsClient()).resolves.toBeNull()
  })
})
