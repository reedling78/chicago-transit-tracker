import { render, screen } from '@testing-library/react'
import PaceRouteChip from '@components/PaceRouteChip'

describe('PaceRouteChip', () => {
  it('renders the route short name with background and text colors', () => {
    render(<PaceRouteChip shortName="208" color="#005DAA" textColor="#FFFFFF" />)
    const chip = screen.getByText('208')
    expect(chip).toBeInTheDocument()
    expect(chip).toHaveStyle({ backgroundColor: '#005DAA', color: '#FFFFFF' })
  })

  it('wraps in a link when href is provided', () => {
    render(<PaceRouteChip shortName="208" color="#005DAA" textColor="#FFFFFF" href="/pace/208" />)
    const link = screen.getByRole('link', { name: '208' })
    expect(link).toHaveAttribute('href', '/pace/208')
  })
})
