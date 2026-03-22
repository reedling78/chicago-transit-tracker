import { render, screen, fireEvent } from '@testing-library/react'
import MobileMenuToggle from '@/app/components/MobileMenuToggle'

const links = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/search', label: 'Search' },
]

describe('MobileMenuToggle', () => {
  it('renders a hamburger button', () => {
    render(<MobileMenuToggle links={links} />)
    expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument()
  })

  it('shows nav links when hamburger is clicked', () => {
    render(<MobileMenuToggle links={links} />)
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }))
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'About' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Search' })).toBeInTheDocument()
  })

  it('hides nav links when toggled closed', () => {
    render(<MobileMenuToggle links={links} />)
    const button = screen.getByRole('button', { name: /open menu/i })
    fireEvent.click(button)
    fireEvent.click(screen.getByRole('button', { name: /close menu/i }))
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument()
  })

  it('closes menu when a link is clicked', () => {
    render(<MobileMenuToggle links={links} />)
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }))
    fireEvent.click(screen.getByRole('link', { name: 'Home' }))
    expect(screen.queryByRole('link', { name: 'About' })).not.toBeInTheDocument()
  })
})
