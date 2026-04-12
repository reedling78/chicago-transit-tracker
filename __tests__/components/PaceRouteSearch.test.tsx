import { render, screen, fireEvent } from '@testing-library/react'
import PaceRouteSearch from '@components/PaceRouteSearch'
import { mockPaceRoute, mockPacePulseRoute } from '../fixtures'

describe('PaceRouteSearch', () => {
  const routes = [
    mockPaceRoute,
    mockPacePulseRoute,
    { ...mockPaceRoute, slug: '250', shortName: '250', longName: 'Dempster Street' },
  ]

  it('renders the search input', () => {
    render(<PaceRouteSearch routes={routes} />)
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('filters by short name prefix on input', () => {
    render(<PaceRouteSearch routes={routes} />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '208' } })
    expect(screen.getByText(/Golf Road/i)).toBeInTheDocument()
    expect(screen.queryByText(/Dempster Street/i)).not.toBeInTheDocument()
  })

  it('filters by long name substring', () => {
    render(<PaceRouteSearch routes={routes} />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Dempster' } })
    expect(screen.getByText(/Dempster Street/i)).toBeInTheDocument()
    expect(screen.queryByText(/Golf Road/i)).not.toBeInTheDocument()
  })

  it('shows nothing when query has no matches', () => {
    render(<PaceRouteSearch routes={routes} />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzzzz' } })
    expect(screen.getByText(/No routes match/i)).toBeInTheDocument()
  })

  it('is case insensitive', () => {
    render(<PaceRouteSearch routes={routes} />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'milwaukee' } })
    expect(screen.getByText(/Milwaukee Avenue/i)).toBeInTheDocument()
  })
})
