import { render, screen } from '@testing-library/react'
import LinkCard from '@components/LinkCard'

describe('LinkCard', () => {
  it('renders the title', () => {
    render(<LinkCard href="/cta/red" title="Red Line" />)
    expect(screen.getByText('Red Line')).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    render(<LinkCard href="/cta/red" title="Red Line" subtitle="Howard → 95th/Dan Ryan" />)
    expect(screen.getByText('Howard → 95th/Dan Ryan')).toBeInTheDocument()
  })

  it('does not render subtitle when omitted', () => {
    render(<LinkCard href="/cta/red" title="Red Line" />)
    expect(screen.queryByText('Howard')).not.toBeInTheDocument()
  })

  it('renders meta when provided', () => {
    render(<LinkCard href="/cta/red" title="Red Line" meta="33 stations" />)
    expect(screen.getByText('33 stations')).toBeInTheDocument()
  })

  it('renders badge when no icon is provided', () => {
    render(<LinkCard href="/cta/red" title="Red Line" badge="Red" badgeColor="#c60c30" />)
    expect(screen.getByText('Red')).toBeInTheDocument()
  })

  it('does not render badge when icon is provided', () => {
    render(<LinkCard href="/cta/red" title="Red Line" badge="Red" icon={<span>icon</span>} />)
    expect(screen.queryByText('Red')).not.toBeInTheDocument()
    expect(screen.getByText('icon')).toBeInTheDocument()
  })

  it('wraps content in a link pointing to href', () => {
    render(<LinkCard href="/cta/red" title="Red Line" />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/cta/red')
  })

  it('applies accent color left border when accentColor is provided', () => {
    render(<LinkCard href="/metra/bnsf" title="BNSF Railway" accentColor="#1A3D7A" />)
    const link = screen.getByRole('link')
    expect(link).toHaveStyle({ borderLeftWidth: '4px', borderLeftColor: '#1A3D7A' })
  })

  it('does not apply accent border when accentColor is omitted', () => {
    render(<LinkCard href="/cta/red" title="Red Line" />)
    const link = screen.getByRole('link')
    expect(link).not.toHaveStyle({ borderLeftWidth: '4px' })
  })

  it('matches snapshot', () => {
    const { container } = render(
      <LinkCard
        href="/cta/red"
        title="Red Line"
        subtitle="Howard → 95th/Dan Ryan"
        meta="33 stations · 23 mi"
        badge="Red"
        badgeColor="#c60c30"
      />,
    )
    expect(container).toMatchSnapshot()
  })
})
