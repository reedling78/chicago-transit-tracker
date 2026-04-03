import { render, screen } from '@testing-library/react'
import Navbar from '@/app/components/Navbar'

describe('Navbar', () => {
  it('renders the site name as a link', () => {
    render(<Navbar />)
    expect(screen.getByRole('link', { name: /chicago transit tracker/i })).toBeInTheDocument()
  })

  it('renders desktop nav links for CTA and Metra', () => {
    render(<Navbar />)
    const ctaLinks = screen.getAllByRole('link', { name: 'CTA' })
    const metraLinks = screen.getAllByRole('link', { name: 'Metra' })
    expect(ctaLinks.length).toBeGreaterThanOrEqual(1)
    expect(metraLinks.length).toBeGreaterThanOrEqual(1)
  })
})
