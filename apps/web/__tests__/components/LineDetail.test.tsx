import { render, screen } from '@testing-library/react'
import LineDetail from '@components/LineDetail'
import { mockLine, mockMetraLine } from '../fixtures'
import type { Line } from '@lib/types'

describe('LineDetail', () => {
  it('renders the station count', () => {
    render(<LineDetail line={mockLine} />)
    expect(screen.getByText('33')).toBeInTheDocument()
  })

  it('renders the route miles', () => {
    render(<LineDetail line={mockLine} />)
    expect(screen.getByText('23 mi')).toBeInTheDocument()
  })

  it('renders the termini', () => {
    render(<LineDetail line={mockLine} />)
    expect(screen.getByText('Howard')).toBeInTheDocument()
    expect(screen.getByText('95th/Dan Ryan')).toBeInTheDocument()
  })

  it('renders schedule section when schedule data exists', () => {
    render(<LineDetail line={mockLine} />)
    expect(screen.getByText('Every 3 min')).toBeInTheDocument()
  })

  it('does not render schedule section when all schedule fields are null', () => {
    const noScheduleLine: Line = {
      ...mockLine,
      peakFrequencyMins: null,
      offPeakFrequencyMins: null,
      firstTrainApprox: null,
      lastTrainApprox: null,
      operatesOvernight: false,
    }
    render(<LineDetail line={noScheduleLine} />)
    expect(screen.queryByText(/frequency/i)).not.toBeInTheDocument()
  })

  it('renders Metra operations section for Metra lines', () => {
    render(<LineDetail line={mockMetraLine} />)
    expect(screen.getAllByText('Union Station').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('BNSF Railway').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Cook, DuPage')).toBeInTheDocument()
  })

  it('renders CTA Route ID in system IDs section', () => {
    render(<LineDetail line={mockLine} />)
    expect(screen.getByText('Red')).toBeInTheDocument()
  })

  it('matches snapshot for CTA line', () => {
    const { container } = render(<LineDetail line={mockLine} />)
    expect(container).toMatchSnapshot()
  })

  it('matches snapshot for Metra line', () => {
    const { container } = render(<LineDetail line={mockMetraLine} />)
    expect(container).toMatchSnapshot()
  })
})
