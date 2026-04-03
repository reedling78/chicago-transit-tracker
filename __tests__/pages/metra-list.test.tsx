import { render, screen } from '@testing-library/react'
import { mockMetraLine } from '../fixtures'

jest.mock('../../app/lib/transit', () => ({
  getLinesForService: jest.fn().mockResolvedValue([mockMetraLine]),
}))

import MetraPage from '@/app/metra/page'

describe('Metra list page', () => {
  it('renders the Metra Lines heading', async () => {
    const ui = await MetraPage()
    render(ui)
    expect(screen.getByRole('heading', { level: 1, name: /metra lines/i })).toBeInTheDocument()
  })

  it('renders a card for each mocked line', async () => {
    const ui = await MetraPage()
    render(ui)
    expect(screen.getByText('BNSF Railway')).toBeInTheDocument()
  })

  it('matches snapshot', async () => {
    const ui = await MetraPage()
    const { container } = render(ui)
    expect(container).toMatchSnapshot()
  })
})
