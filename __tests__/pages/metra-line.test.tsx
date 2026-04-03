import { render, screen } from '@testing-library/react'
import { mockMetraLine, mockMetraStation } from '../fixtures'

jest.mock('../../app/lib/transit', () => ({
  getLinesForService: jest.fn().mockResolvedValue([mockMetraLine]),
  getLine: jest.fn().mockResolvedValue(mockMetraLine),
  getStationsForLine: jest.fn().mockResolvedValue([mockMetraStation]),
}))

import MetraLinePage from '@/app/metra/[line]/page'

describe('Metra line detail page', () => {
  const params = Promise.resolve({ line: 'bnsf' })

  it('renders the line name heading', async () => {
    const ui = await MetraLinePage({ params })
    render(ui)
    expect(screen.getByRole('heading', { level: 1, name: 'BNSF Railway' })).toBeInTheDocument()
  })

  it('renders the breadcrumb with Metra Lines link', async () => {
    const ui = await MetraLinePage({ params })
    render(ui)
    expect(screen.getByRole('link', { name: 'Metra Lines' })).toBeInTheDocument()
  })

  it('renders the station in the list', async () => {
    const ui = await MetraLinePage({ params })
    render(ui)
    expect(screen.getAllByText('Aurora').length).toBeGreaterThanOrEqual(1)
  })

  it('renders "Line not found" when getLine returns null', async () => {
    const { getLine } = await import('../../app/lib/transit')
    ;(getLine as jest.Mock).mockResolvedValueOnce(null)

    const ui = await MetraLinePage({ params })
    render(ui)
    expect(screen.getByText('Line not found.')).toBeInTheDocument()
  })

  it('matches snapshot', async () => {
    const ui = await MetraLinePage({ params })
    const { container } = render(ui)
    expect(container).toMatchSnapshot()
  })
})
