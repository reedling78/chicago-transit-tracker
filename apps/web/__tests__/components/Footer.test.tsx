import { render, screen } from '@testing-library/react'
import Footer from '@components/Footer'

describe('Footer', () => {
  it('renders the site name', () => {
    render(<Footer />)
    expect(screen.getByText('Chicago Transit Tracker')).toBeInTheDocument()
  })

  it('renders a Terms of Use link to /terms', () => {
    render(<Footer />)
    expect(screen.getByRole('link', { name: 'Terms of Use' })).toHaveAttribute('href', '/terms')
  })

  it('renders a Privacy link to /privacy', () => {
    render(<Footer />)
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy')
  })

  it('renders a Site Map link to /sitemap', () => {
    render(<Footer />)
    expect(screen.getByRole('link', { name: 'Site Map' })).toHaveAttribute('href', '/sitemap')
  })

  it('renders the not-affiliated disclaimer', () => {
    render(<Footer />)
    expect(screen.getByText(/not affiliated with CTA or Metra/i)).toBeInTheDocument()
  })

  it('matches snapshot', () => {
    const { container } = render(<Footer />)
    expect(container).toMatchSnapshot()
  })
})
