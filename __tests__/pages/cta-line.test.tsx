import { render, screen } from '@testing-library/react'
import { mockLine, mockStation } from '../fixtures'

jest.mock('../../app/lib/transit', () => ({
  getLinesForService: jest.fn().mockResolvedValue([mockLine]),
  getLine: jest.fn().mockResolvedValue(mockLine),
  getStationsForLine: jest.fn().mockResolvedValue([mockStation]),
}))

jest.mock('../../app/components/CTAAlerts', () => {
  return function MockCTAAlerts() {
    return <div data-testid="cta-alerts-mock" />
  }
})

import CTALinePage from '@/app/cta/[line]/page'

describe('CTA line detail page', () => {
  const params = Promise.resolve({ line: 'red' })

  it('renders the line name heading', async () => {
    const ui = await CTALinePage({ params })
    render(ui)
    expect(screen.getByRole('heading', { level: 1, name: 'Red Line' })).toBeInTheDocument()
  })

  it('renders the breadcrumb with CTA Lines link', async () => {
    const ui = await CTALinePage({ params })
    render(ui)
    expect(screen.getByRole('link', { name: 'CTA Lines' })).toBeInTheDocument()
  })

  it('renders the station list', async () => {
    const ui = await CTALinePage({ params })
    render(ui)
    expect(screen.getByText('Clark/Lake')).toBeInTheDocument()
  })

  it('renders "Line not found" when getLine returns null', async () => {
    const { getLine } = await import('../../app/lib/transit')
    ;(getLine as jest.Mock).mockResolvedValueOnce(null)

    const ui = await CTALinePage({ params })
    render(ui)
    expect(screen.getByText('Line not found.')).toBeInTheDocument()
  })

  it('matches snapshot', async () => {
    const ui = await CTALinePage({ params })
    const { container } = render(ui)
    expect(container).toMatchSnapshot()
  })
})
