import { render, screen } from '@testing-library/react'
import LineChipList, { type LineLinkInfo } from '@components/LineChipList'

describe('LineChipList', () => {
  const lineLookup: Record<string, LineLinkInfo> = {
    Red: { slug: 'red', service: 'cta' },
    Blue: { slug: 'blue', service: 'cta' },
    'UP-N': { slug: 'up-n', service: 'metra' },
  }

  it('renders nothing when lineNames is empty', () => {
    const { container } = render(<LineChipList lineNames={[]} lineLookup={lineLookup} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a CTA line chip as a link to /cta/{slug}', () => {
    render(<LineChipList lineNames={['Red']} lineLookup={lineLookup} />)
    const link = screen.getByRole('link', { name: /red line/i })
    expect(link).toHaveAttribute('href', '/cta/red')
    expect(link).toHaveTextContent('Red')
  })

  it('renders a Metra line chip as a link to /metra/{slug}', () => {
    render(<LineChipList lineNames={['UP-N']} lineLookup={lineLookup} />)
    const link = screen.getByRole('link', { name: /up-n line/i })
    expect(link).toHaveAttribute('href', '/metra/up-n')
  })

  it('renders multiple chips', () => {
    render(<LineChipList lineNames={['Red', 'Blue', 'UP-N']} lineLookup={lineLookup} />)
    expect(screen.getByRole('link', { name: /red line/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /blue line/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /up-n line/i })).toBeInTheDocument()
  })

  it('renders a line not in the lookup as a non-link span', () => {
    render(<LineChipList lineNames={['UnknownLine']} lineLookup={lineLookup} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('UnknownLine')).toBeInTheDocument()
  })

  it('applies official CTA colors to Red Line chip', () => {
    render(<LineChipList lineNames={['Red']} lineLookup={lineLookup} />)
    const link = screen.getByRole('link', { name: /red line/i })
    // Official CTA Red Line color #C60C30
    expect(link).toHaveStyle({ backgroundColor: '#C60C30' })
  })

  it('falls back to gray chip styling for a line with no color entry', () => {
    render(<LineChipList lineNames={['MysteryLine']} lineLookup={lineLookup} />)
    const span = screen.getByText('MysteryLine')
    expect(span.className).toContain('bg-gray-100')
  })

  it('matches snapshot', () => {
    const { container } = render(
      <LineChipList lineNames={['Red', 'Blue', 'UnknownLine']} lineLookup={lineLookup} />,
    )
    expect(container).toMatchSnapshot()
  })
})
