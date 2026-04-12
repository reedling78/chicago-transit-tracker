import { render, screen } from '@testing-library/react'
import Hero from '@components/Hero'

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

  it('renders CTA, Metra, and Pace service labels', () => {
    render(<Hero />)
    expect(screen.getAllByText('CTA').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Metra').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Pace').length).toBeGreaterThanOrEqual(1)
  })

  it('renders three service cards including Pace', () => {
    render(<Hero />)
    expect(screen.getByRole('link', { name: /Explore CTA/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Explore Metra/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Explore Pace/i })).toBeInTheDocument()
  })

  it('Pace card is labeled Schedules & Routes', () => {
    render(<Hero />)
    expect(screen.getByText(/Schedules & Routes/i)).toBeInTheDocument()
  })

  it('renders a link to /pace', () => {
    render(<Hero />)
    const links = screen.getAllByRole('link')
    const paceLink = links.find((l) => l.getAttribute('href') === '/pace')
    expect(paceLink).toBeDefined()
  })

  it('matches snapshot', () => {
    const { container } = render(<Hero />)
    expect(container).toMatchSnapshot()
  })
})
