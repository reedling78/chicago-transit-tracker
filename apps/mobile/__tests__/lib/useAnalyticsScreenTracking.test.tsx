import { renderHook } from '@testing-library/react-native'

import { useAnalyticsScreenTracking } from '../../lib/useAnalyticsScreenTracking'

const mockUsePathname = jest.fn()
jest.mock('expo-router', () => ({
  usePathname: () => mockUsePathname(),
}))

const mockTrackScreenView = jest.fn()
jest.mock('../../lib/analytics', () => ({
  trackScreenView: (...args: unknown[]) => mockTrackScreenView(...args),
}))

beforeEach(() => {
  jest.clearAllMocks()
})

describe('useAnalyticsScreenTracking', () => {
  it('emits trackScreenView with the current pathname on mount', () => {
    mockUsePathname.mockReturnValue('/cta/red')
    renderHook(() => useAnalyticsScreenTracking())
    expect(mockTrackScreenView).toHaveBeenCalledWith({
      screen_name: '/cta/red',
      screen_class: '/cta/red',
    })
  })

  it('re-fires when the pathname changes', () => {
    mockUsePathname.mockReturnValue('/')
    const { rerender } = renderHook(() => useAnalyticsScreenTracking())
    mockUsePathname.mockReturnValue('/metra/bnsf')
    rerender({})
    expect(mockTrackScreenView).toHaveBeenCalledTimes(2)
    expect(mockTrackScreenView).toHaveBeenLastCalledWith({
      screen_name: '/metra/bnsf',
      screen_class: '/metra/bnsf',
    })
  })

  it('skips empty pathnames (still-resolving router state)', () => {
    mockUsePathname.mockReturnValue('')
    renderHook(() => useAnalyticsScreenTracking())
    expect(mockTrackScreenView).not.toHaveBeenCalled()
  })
})
