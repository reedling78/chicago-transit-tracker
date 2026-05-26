const mockLogEvent = jest.fn()
const mockSetUserId = jest.fn()
const mockSetUserProperties = jest.fn()
const mockGetAnalyticsClient = jest.fn()

jest.mock('firebase/analytics', () => ({
  logEvent: (...args: unknown[]) => mockLogEvent(...args),
  setUserId: (...args: unknown[]) => mockSetUserId(...args),
  setUserProperties: (...args: unknown[]) => mockSetUserProperties(...args),
}))

jest.mock('../../app/lib/firebase-client', () => ({
  getAnalyticsClient: () => mockGetAnalyticsClient(),
}))

import { trackEvent, trackPageView, setUser, setUserProperty } from '../../app/lib/analytics'

describe('web analytics wrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('when the analytics SDK is unavailable', () => {
    beforeEach(() => {
      mockGetAnalyticsClient.mockResolvedValue(null)
    })

    it('trackEvent no-ops silently', async () => {
      await trackEvent('sign_up', { method: 'apple' })
      expect(mockLogEvent).not.toHaveBeenCalled()
    })

    it('trackPageView no-ops silently', async () => {
      await trackPageView({ page_path: '/' })
      expect(mockLogEvent).not.toHaveBeenCalled()
    })

    it('setUser no-ops silently', async () => {
      await setUser('uid-123')
      expect(mockSetUserId).not.toHaveBeenCalled()
    })

    it('setUserProperty no-ops silently', async () => {
      await setUserProperty('auth_provider', 'google')
      expect(mockSetUserProperties).not.toHaveBeenCalled()
    })
  })

  describe('when the analytics SDK is available', () => {
    const fakeAnalytics = { __mock: 'analytics' }

    beforeEach(() => {
      mockGetAnalyticsClient.mockResolvedValue(fakeAnalytics)
    })

    it('trackEvent forwards name and params to logEvent', async () => {
      await trackEvent('dashboard_item_added', {
        item_type: 'station',
        item_id: 'union-station-metra',
      })
      expect(mockLogEvent).toHaveBeenCalledWith(fakeAnalytics, 'dashboard_item_added', {
        item_type: 'station',
        item_id: 'union-station-metra',
      })
    })

    it('trackPageView forwards page_view event', async () => {
      await trackPageView({
        page_path: '/cta/red',
        page_location: 'https://chicagotransittracker.com/cta/red',
        page_title: 'Red Line',
      })
      expect(mockLogEvent).toHaveBeenCalledWith(fakeAnalytics, 'page_view', {
        page_path: '/cta/red',
        page_location: 'https://chicagotransittracker.com/cta/red',
        page_title: 'Red Line',
      })
    })

    it('setUser forwards the uid to setUserId', async () => {
      await setUser('uid-123')
      expect(mockSetUserId).toHaveBeenCalledWith(fakeAnalytics, 'uid-123')
    })

    it('setUser forwards null to clear the user', async () => {
      await setUser(null)
      expect(mockSetUserId).toHaveBeenCalledWith(fakeAnalytics, null)
    })

    it('setUserProperty wraps the value in a single-key object', async () => {
      await setUserProperty('auth_provider', 'apple')
      expect(mockSetUserProperties).toHaveBeenCalledWith(fakeAnalytics, { auth_provider: 'apple' })
    })
  })
})
