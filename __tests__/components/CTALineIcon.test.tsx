import { render, screen } from '@testing-library/react'
import CTALineIcon from '@/app/components/CTALineIcon'

describe('CTALineIcon', () => {
  it('renders with correct aria-label for Red line', () => {
    render(<CTALineIcon line="Red" />)
    expect(screen.getByRole('img', { name: 'Red Line' })).toBeInTheDocument()
  })

  it('renders with correct aria-label for Blue line', () => {
    render(<CTALineIcon line="Blue" />)
    expect(screen.getByRole('img', { name: 'Blue Line' })).toBeInTheDocument()
  })

  it('renders with correct background color', () => {
    render(<CTALineIcon line="Red" />)
    const icon = screen.getByRole('img', { name: 'Red Line' })
    expect(icon).toHaveStyle({ backgroundColor: '#c60c30' })
  })

  it('returns null for an unknown line name', () => {
    const { container } = render(<CTALineIcon line="UnknownLine" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('applies rounded corners by default', () => {
    render(<CTALineIcon line="Red" />)
    const icon = screen.getByRole('img', { name: 'Red Line' })
    expect(icon.className).toContain('rounded-lg')
  })

  it('omits rounded corners when rounded={false}', () => {
    render(<CTALineIcon line="Red" rounded={false} />)
    const icon = screen.getByRole('img', { name: 'Red Line' })
    expect(icon.className).not.toContain('rounded-lg')
  })

  it('matches snapshot for Red line', () => {
    const { container } = render(<CTALineIcon line="Red" size={48} />)
    expect(container).toMatchSnapshot()
  })

  it('matches snapshot for Yellow line (light text)', () => {
    const { container } = render(<CTALineIcon line="Yellow" size={48} />)
    expect(container).toMatchSnapshot()
  })
})
