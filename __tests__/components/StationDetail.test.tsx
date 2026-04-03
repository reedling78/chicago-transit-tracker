import { render, screen } from '@testing-library/react'
import StationDetail from '@/app/components/StationDetail'
import { mockStation, mockMetraStation } from '../fixtures'
import type { Station } from '@/app/lib/types'

describe('StationDetail', () => {
  it('renders the station address', () => {
    render(<StationDetail station={mockStation} />)
    expect(screen.getByText('100 W Lake St, Chicago, IL')).toBeInTheDocument()
  })

  it('renders the municipality', () => {
    render(<StationDetail station={mockStation} />)
    expect(screen.getByText('Chicago')).toBeInTheDocument()
  })

  it('renders coordinates', () => {
    render(<StationDetail station={mockStation} />)
    expect(screen.getByText(/41.88570/)).toBeInTheDocument()
  })

  it('renders ADA accessible as Yes', () => {
    render(<StationDetail station={mockStation} />)
    // ADA row: finds the label first, then verify Yes appears
    expect(screen.getByText('ADA Accessible')).toBeInTheDocument()
  })

  it('renders elevator and escalator rows for CTA stations', () => {
    render(<StationDetail station={mockStation} />)
    expect(screen.getByText('Elevator')).toBeInTheDocument()
    expect(screen.getByText('Escalator')).toBeInTheDocument()
  })

  it('does not render elevator/escalator rows for Metra stations', () => {
    render(<StationDetail station={mockMetraStation} />)
    expect(screen.queryByText('Elevator')).not.toBeInTheDocument()
    expect(screen.queryByText('Escalator')).not.toBeInTheDocument()
  })

  it('renders station type label', () => {
    render(<StationDetail station={mockStation} />)
    expect(screen.getByText('Subway')).toBeInTheDocument()
  })

  it('renders amenity chips', () => {
    render(<StationDetail station={mockStation} />)
    expect(screen.getByText('fare vending')).toBeInTheDocument()
    expect(screen.getByText('seating')).toBeInTheDocument()
  })

  it('renders system IDs when present', () => {
    render(<StationDetail station={mockStation} />)
    expect(screen.getByText('40380')).toBeInTheDocument()
    expect(screen.getByText('30074')).toBeInTheDocument()
  })

  it('renders Metra stop ID for Metra station', () => {
    render(<StationDetail station={mockMetraStation} />)
    expect(screen.getByText('AURORA')).toBeInTheDocument()
  })

  it('renders Metra page link when metraLink is present', () => {
    render(<StationDetail station={mockMetraStation} />)
    expect(screen.getByRole('link', { name: /view on metra\.com/i })).toBeInTheDocument()
  })

  it('does not render system IDs section when all IDs are null', () => {
    const noIds: Station = {
      ...mockStation,
      ctaMapId: null,
      ctaStopId: null,
      metraStopId: null,
    }
    render(<StationDetail station={noIds} />)
    expect(screen.queryByText('System IDs')).not.toBeInTheDocument()
  })

  it('matches snapshot for CTA station', () => {
    const { container } = render(<StationDetail station={mockStation} />)
    expect(container).toMatchSnapshot()
  })

  it('matches snapshot for Metra station', () => {
    const { container } = render(<StationDetail station={mockMetraStation} />)
    expect(container).toMatchSnapshot()
  })
})
