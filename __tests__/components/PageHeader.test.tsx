import { render, screen } from '@testing-library/react'
import PageHeader from '@/app/components/PageHeader'

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
    render(<PageHeader title="CTA Lines"><span>Extra content</span></PageHeader>)
    expect(screen.getByText('Extra content')).toBeInTheDocument()
  })

  it('matches snapshot', () => {
    const { container } = render(
      <PageHeader
        title="CTA Lines"
        description="8 rapid transit lines."
        badges={<span>Badge</span>}
      >
        <span>Child</span>
      </PageHeader>
    )
    expect(container).toMatchSnapshot()
  })
})
