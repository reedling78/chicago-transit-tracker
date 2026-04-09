import { render, screen } from '@testing-library/react'
import NotFound, { metadata } from '@/app/not-found'

describe('NotFound page', () => {
  it('renders the 404 heading', () => {
    render(<NotFound />)
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('renders the transit-themed headline', () => {
    render(<NotFound />)
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /you've reached the end of the line/i,
      }),
    ).toBeInTheDocument()
  })

  it('renders the subtext', () => {
    render(<NotFound />)
    expect(screen.getByText(/all passengers must exit/i)).toBeInTheDocument()
  })

  it('renders all 4 navigation links', () => {
    render(<NotFound />)
    const links = screen.getAllByRole('link')
    const hrefs = links.map((link) => link.getAttribute('href'))
    expect(hrefs).toContain('/')
    expect(hrefs).toContain('/cta')
    expect(hrefs).toContain('/metra')
    expect(hrefs).toContain('/cta/alerts')
  })

  it('has required metadata fields', () => {
    expect(metadata.title).toBe('Page Not Found')
    expect(metadata.description).toBeDefined()
    expect(metadata.openGraph).toBeDefined()
    expect(metadata.twitter).toBeDefined()
    expect(metadata.robots).toEqual({ index: false })
  })

  it('matches snapshot', () => {
    const { container } = render(<NotFound />)
    expect(container).toMatchSnapshot()
  })
})
