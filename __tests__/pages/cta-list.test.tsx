import { render, screen } from '@testing-library/react'
import { mockLine } from '../fixtures'

jest.mock('../../app/lib/transit', () => ({
  getLinesForService: jest.fn().mockResolvedValue([mockLine]),
}))

// Import after mock is set up
import CTAPage from '@/app/cta/page'

describe('CTA list page', () => {
  it('renders the CTA Lines heading', async () => {
    const ui = await CTAPage()
    render(ui)
    expect(screen.getByRole('heading', { level: 1, name: /cta lines/i })).toBeInTheDocument()
  })

  it('renders a card for each mocked line', async () => {
    const ui = await CTAPage()
    render(ui)
    expect(screen.getByText('Red Line')).toBeInTheDocument()
  })

  it('matches snapshot', async () => {
    const ui = await CTAPage()
    const { container } = render(ui)
    expect(container).toMatchSnapshot()
  })
})
