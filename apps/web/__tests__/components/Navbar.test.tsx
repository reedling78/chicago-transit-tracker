import { render, screen } from '@testing-library/react'

jest.mock('../../app/components/UserMenu', () => {
  return function MockUserMenu() {
    return <div data-testid="user-menu" />
  }
})

import Navbar from '@components/Navbar'

describe('Navbar', () => {
  it('renders the site name as a link', () => {
    render(<Navbar />)
    expect(screen.getByRole('link', { name: /chicago transit tracker/i })).toBeInTheDocument()
  })

  it('renders desktop nav links for CTA, Metra, and Pace', () => {
    render(<Navbar />)
    const ctaLinks = screen.getAllByRole('link', { name: 'CTA' })
    const metraLinks = screen.getAllByRole('link', { name: 'Metra' })
    const paceLinks = screen.getAllByRole('link', { name: 'Pace' })
    expect(ctaLinks.length).toBeGreaterThanOrEqual(1)
    expect(metraLinks.length).toBeGreaterThanOrEqual(1)
    expect(paceLinks.length).toBeGreaterThanOrEqual(1)
  })

  it('renders a Pace link pointing to /pace', () => {
    render(<Navbar />)
    const paceLinks = screen.getAllByRole('link', { name: 'Pace' })
    expect(paceLinks[0]).toHaveAttribute('href', '/pace')
  })
})
