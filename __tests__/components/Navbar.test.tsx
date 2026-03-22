import { render, screen } from '@testing-library/react'
import Navbar from '@/app/components/Navbar'

describe('Navbar', () => {
  it('renders the site name as a link', () => {
    render(<Navbar />)
    expect(screen.getByRole('link', { name: /chicago transit tracker/i })).toBeInTheDocument()
  })

  it('renders desktop nav links for all three pages', () => {
    render(<Navbar />)
    // Desktop links are hidden on mobile via Tailwind (display:none), but still present in the DOM
    const homeLinks = screen.getAllByRole('link', { name: 'Home' })
    const aboutLinks = screen.getAllByRole('link', { name: 'About' })
    const searchLinks = screen.getAllByRole('link', { name: 'Search' })
    expect(homeLinks.length).toBeGreaterThanOrEqual(1)
    expect(aboutLinks.length).toBeGreaterThanOrEqual(1)
    expect(searchLinks.length).toBeGreaterThanOrEqual(1)
  })
})
