import { render, screen } from '@testing-library/react'
import PageHeader from '@components/PageHeader'

// next/image uses features not available in jsdom. Render it as a plain <img>
// so we can assert on the src without pulling in Next's runtime.
// Next.js-specific boolean props (fill, priority) are stripped to avoid React DOM warnings.
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const { src, alt, fill, priority, sizes, ...rest } = props
    void fill
    void priority
    void sizes
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src as string} alt={alt as string} {...rest} />
  },
}))

describe('PageHeader', () => {
  it('renders the title as an h1', () => {
    render(<PageHeader title="CTA Lines" />)
    expect(screen.getByRole('heading', { level: 1, name: 'CTA Lines' })).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<PageHeader title="CTA Lines" description="8 rapid transit lines." />)
    expect(screen.getByText('8 rapid transit lines.')).toBeInTheDocument()
  })

  it('does not render description element when omitted', () => {
    render(<PageHeader title="CTA Lines" />)
    expect(screen.queryByText(/rapid transit/)).not.toBeInTheDocument()
  })

  it('renders badges slot when provided', () => {
    render(<PageHeader title="CTA Lines" badges={<span>Red Line</span>} />)
    expect(screen.getByText('Red Line')).toBeInTheDocument()
  })

  it('renders children when provided', () => {
    render(
      <PageHeader title="CTA Lines">
        <span>Extra content</span>
      </PageHeader>,
    )
    expect(screen.getByText('Extra content')).toBeInTheDocument()
  })

  it('renders the hero-header background image (decorative, empty alt)', () => {
    const { container } = render(<PageHeader title="CTA Lines" />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('src')).toContain('/hero-header.jpg')
    expect(img?.getAttribute('alt')).toBe('')
  })

  it('matches snapshot', () => {
    const { container } = render(
      <PageHeader
        title="CTA Lines"
        description="8 rapid transit lines."
        badges={<span>Badge</span>}
      >
        <span>Child</span>
      </PageHeader>,
    )
    expect(container).toMatchSnapshot()
  })
})
