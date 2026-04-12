import { render, screen } from '@testing-library/react'
import Breadcrumb from '@components/Breadcrumb'

describe('Breadcrumb', () => {
  const items = [
    { label: 'CTA Lines', href: '/cta' },
    { label: 'Red Line', href: '/cta/red' },
    { label: 'Clark/Lake' },
  ]

  it('renders all labels', () => {
    render(<Breadcrumb items={items} />)
    expect(screen.getByText('CTA Lines')).toBeInTheDocument()
    expect(screen.getByText('Red Line')).toBeInTheDocument()
    expect(screen.getByText('Clark/Lake')).toBeInTheDocument()
  })

  it('last item has aria-current="page" and is not a link', () => {
    render(<Breadcrumb items={items} />)
    const last = screen.getByText('Clark/Lake')
    expect(last).toHaveAttribute('aria-current', 'page')
    expect(last.tagName).not.toBe('A')
  })

  it('non-last items with href render as links', () => {
    render(<Breadcrumb items={items} />)
    expect(screen.getByRole('link', { name: 'CTA Lines' })).toHaveAttribute('href', '/cta')
    expect(screen.getByRole('link', { name: 'Red Line' })).toHaveAttribute('href', '/cta/red')
  })

  it('renders single item without separator', () => {
    render(<Breadcrumb items={[{ label: 'Home' }]} />)
    expect(screen.queryByText('›')).not.toBeInTheDocument()
  })

  it('matches snapshot', () => {
    const { container } = render(<Breadcrumb items={items} />)
    expect(container).toMatchSnapshot()
  })
})
