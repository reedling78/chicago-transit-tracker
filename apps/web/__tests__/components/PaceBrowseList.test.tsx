import { render, screen } from '@testing-library/react'
import PaceBrowseList from '@components/PaceBrowseList'
import { mockPaceRoute, mockPacePulseRoute } from '../fixtures'

describe('PaceBrowseList', () => {
  const routes = [
    mockPaceRoute, // 208, local, north
    mockPacePulseRoute, // Milwaukee Pulse, pulse, northwest
    {
      ...mockPaceRoute,
      slug: '353',
      shortName: '353',
      longName: 'Cumberland',
      region: 'northwest' as const,
    },
    {
      ...mockPaceRoute,
      slug: '634',
      shortName: '634',
      longName: 'Harvey',
      region: 'south' as const,
    },
  ]

  it('shows the Pulse feature block', () => {
    render(<PaceBrowseList routes={routes} />)
    expect(screen.getByRole('heading', { name: /Pulse/i })).toBeInTheDocument()
    expect(screen.getByText(/Milwaukee Avenue/i)).toBeInTheDocument()
  })

  it('shows region headings for non-Pulse routes', () => {
    render(<PaceBrowseList routes={routes} />)
    expect(screen.getByRole('heading', { name: /North$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Northwest/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /South$/i })).toBeInTheDocument()
  })

  it('lists routes under their region heading', () => {
    render(<PaceBrowseList routes={routes} />)
    expect(screen.getByText(/Golf Road/i)).toBeInTheDocument()
    expect(screen.getByText(/Harvey/i)).toBeInTheDocument()
  })
})
