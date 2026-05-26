const mockTrackEvent = jest.fn()

jest.mock('@lib/analytics', () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}))

import { render } from '@testing-library/react'
import AnalyticsMount from '@components/AnalyticsMount'

describe('AnalyticsMount', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('fires the configured event once on mount', () => {
    render(<AnalyticsMount event="line_opened" params={{ service: 'cta', line_id: 'red' }} />)
    expect(mockTrackEvent).toHaveBeenCalledTimes(1)
    expect(mockTrackEvent).toHaveBeenCalledWith('line_opened', {
      service: 'cta',
      line_id: 'red',
    })
  })

  it('renders nothing into the DOM', () => {
    const { container } = render(
      <AnalyticsMount event="station_opened" params={{ service: 'metra', station_id: 's' }} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('does not re-fire on a re-render with the same props', () => {
    const { rerender } = render(
      <AnalyticsMount event="alerts_opened" params={{ service: 'cta' }} />,
    )
    rerender(<AnalyticsMount event="alerts_opened" params={{ service: 'cta' }} />)
    expect(mockTrackEvent).toHaveBeenCalledTimes(1)
  })
})
