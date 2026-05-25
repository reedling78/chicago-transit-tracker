const mockTrackPageView = jest.fn()

jest.mock('@lib/analytics', () => ({
  trackPageView: (...args: unknown[]) => mockTrackPageView(...args),
}))

const mockPathname = jest.fn<string, []>()
const mockSearchParams = jest.fn<URLSearchParams, []>()

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useSearchParams: () => mockSearchParams(),
}))

import { render } from '@testing-library/react'
import Analytics from '@components/Analytics'

describe('Analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPathname.mockReturnValue('/cta/red')
    mockSearchParams.mockReturnValue(new URLSearchParams())
  })

  it('renders null (no DOM output)', () => {
    const { container } = render(<Analytics />)
    expect(container).toBeEmptyDOMElement()
  })

  it('fires trackPageView with pathname on mount', () => {
    render(<Analytics />)
    expect(mockTrackPageView).toHaveBeenCalledTimes(1)
    expect(mockTrackPageView).toHaveBeenCalledWith(
      expect.objectContaining({
        page_path: '/cta/red',
        page_location: expect.any(String),
        page_title: expect.any(String),
      }),
    )
  })

  it('includes query string in page_path when present', () => {
    mockSearchParams.mockReturnValue(new URLSearchParams('ref=newsletter'))
    render(<Analytics />)
    expect(mockTrackPageView).toHaveBeenCalledWith(
      expect.objectContaining({ page_path: '/cta/red?ref=newsletter' }),
    )
  })
})
