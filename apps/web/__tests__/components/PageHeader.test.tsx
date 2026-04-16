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

  it('renders a breadcrumb trail when breadcrumbItems is provided', () => {
    render(
      <PageHeader
        title="Clark/Lake"
        breadcrumbItems={[
          { label: 'CTA Lines', href: '/cta' },
          { label: 'Red Line', href: '/cta/red' },
          { label: 'Clark/Lake' },
        ]}
      />,
    )
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(nav).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'CTA Lines' })).toHaveAttribute('href', '/cta')
    expect(screen.getByRole('link', { name: 'Red Line' })).toHaveAttribute('href', '/cta/red')
    // The last item appears twice: once in the breadcrumb (as aria-current="page" span),
    // and once as the h1 title.
    expect(nav.querySelector('[aria-current="page"]')).toHaveTextContent('Clark/Lake')
  })

  it('does not render a breadcrumb when breadcrumbItems is omitted', () => {
    render(<PageHeader title="CTA Lines" />)
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument()
  })

  it('uses a custom imageSrc when provided', () => {
    const { container } = render(
      <PageHeader title="Metra Lines" imageSrc="/hero-header-metra.jpg" />,
    )
    const img = container.querySelector('img')
    expect(img?.getAttribute('src')).toContain('/hero-header-metra.jpg')
  })

  it('does not render a breadcrumb when breadcrumbItems is empty', () => {
    render(<PageHeader title="CTA Lines" breadcrumbItems={[]} />)
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument()
  })

  it('renders icon inline with the title when provided', () => {
    render(<PageHeader title="Brown Line" icon={<span data-testid="line-icon">icon</span>} />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Brown Line')
    expect(heading.querySelector('[data-testid="line-icon"]')).toBeInTheDocument()
  })

  it('does not render icon wrapper when icon is omitted', () => {
    const { container } = render(<PageHeader title="CTA Lines" />)
    const heading = container.querySelector('h1')
    expect(heading?.querySelectorAll('span')).toHaveLength(0)
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
