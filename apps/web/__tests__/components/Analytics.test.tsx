import { render } from '@testing-library/react'
import Analytics from '@components/Analytics'

// next/navigation is auto-mocked by Next.js jest config
// Analytics returns null from render — just verify it mounts without error

describe('Analytics', () => {
  it('renders without throwing', () => {
    expect(() => render(<Analytics />)).not.toThrow()
  })

  it('renders null (no DOM output)', () => {
    const { container } = render(<Analytics />)
    expect(container).toBeEmptyDOMElement()
  })

  it('matches snapshot', () => {
    const { container } = render(<Analytics />)
    expect(container).toMatchSnapshot()
  })
})
