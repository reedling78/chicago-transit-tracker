import { render, screen } from '@testing-library/react'
import Hero from '@/app/components/Hero'

describe('Hero', () => {
  it('renders the main heading', () => {
    render(<Hero />)
    expect(
      screen.getByRole('heading', { level: 1, name: /chicago transit tracker/i }),
    ).toBeInTheDocument()
  })

  it('renders a link to /cta', () => {
    render(<Hero />)
    const links = screen.getAllByRole('link')
    const ctaLink = links.find((l) => l.getAttribute('href') === '/cta')
    expect(ctaLink).toBeDefined()
  })

  it('renders a link to /metra', () => {
    render(<Hero />)
    const links = screen.getAllByRole('link')
    const metraLink = links.find((l) => l.getAttribute('href') === '/metra')
    expect(metraLink).toBeDefined()
  })

  it('renders CTA and Metra service labels', () => {
    render(<Hero />)
    expect(screen.getAllByText('CTA').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Metra').length).toBeGreaterThanOrEqual(1)
  })

  it('matches snapshot', () => {
    const { container } = render(<Hero />)
    expect(container).toMatchSnapshot()
  })
})
