import { render, screen } from '@testing-library/react'
import HomePage from '@/app/page'

jest.mock('@lib/metra-realtime', () => ({
  fetchMetraFeed: jest.fn(() => new Promise(() => {})),
}))

describe('Home page', () => {
  it('renders the Hero heading', () => {
    const ui = HomePage()
    render(ui)
    expect(
      screen.getByRole('heading', { level: 1, name: /chicago transit tracker/i }),
    ).toBeInTheDocument()
  })

  it('matches snapshot', () => {
    const { container } = render(HomePage())
    expect(container).toMatchSnapshot()
  })
})
