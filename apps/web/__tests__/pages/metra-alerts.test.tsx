import { render, screen } from '@testing-library/react'

jest.mock('@components/MetraAlerts', () => {
  return function MockMetraAlerts() {
    return <div data-testid="metra-alerts">Metra Alerts Component</div>
  }
})

import MetraAlertsPage from '@/app/metra/alerts/page'

describe('Metra Alerts page', () => {
  it('renders the page heading', () => {
    render(<MetraAlertsPage />)
    expect(
      screen.getByRole('heading', { level: 1, name: /metra service alerts/i }),
    ).toBeInTheDocument()
  })

  it('renders the MetraAlerts component', () => {
    render(<MetraAlertsPage />)
    expect(screen.getByTestId('metra-alerts')).toBeInTheDocument()
  })

  it('uses the Metra hero background image', () => {
    const { container } = render(<MetraAlertsPage />)
    const img = container.querySelector('img')
    expect(img?.getAttribute('src')).toContain('hero-header-metra.jpg')
  })

  it('matches snapshot', () => {
    const { container } = render(<MetraAlertsPage />)
    expect(container).toMatchSnapshot()
  })
})
