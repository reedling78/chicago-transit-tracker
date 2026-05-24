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

const originalMeasurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID

describe('firebase-client getAnalyticsClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    if (originalMeasurementId === undefined) {
      delete process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
    } else {
      process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = originalMeasurementId
    }
  })

  it('returns null when measurementId is not configured', async () => {
    delete process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
    const { getAnalyticsClient } = await loadClient()
    await expect(getAnalyticsClient()).resolves.toBeNull()
    expect(mockIsSupported).not.toHaveBeenCalled()
  })

  it('returns null when the browser environment is unsupported', async () => {
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = 'G-TEST'
    mockIsSupported.mockResolvedValue(false)
    const { getAnalyticsClient } = await loadClient()
    await expect(getAnalyticsClient()).resolves.toBeNull()
    expect(mockGetAnalytics).not.toHaveBeenCalled()
  })

  it('initializes analytics once when supported and reuses it', async () => {
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = 'G-TEST'
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
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = 'G-TEST'
    mockIsSupported.mockRejectedValue(new Error('boom'))
    const { getAnalyticsClient } = await loadClient()
    await expect(getAnalyticsClient()).resolves.toBeNull()
  })
})
