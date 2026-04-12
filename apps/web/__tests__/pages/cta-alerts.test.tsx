import { render, screen } from '@testing-library/react'

jest.mock('@components/CTAAlerts', () => {
  return function MockCTAAlerts() {
    return <div data-testid="cta-alerts">CTA Alerts Component</div>
  }
})

import CTAAlertsPage from '@/app/cta/alerts/page'

describe('CTA Alerts page', () => {
  it('renders the page heading', () => {
    render(<CTAAlertsPage />)
    expect(
      screen.getByRole('heading', { level: 1, name: /cta service alerts/i }),
    ).toBeInTheDocument()
  })

  it('renders the CTAAlerts component', () => {
    render(<CTAAlertsPage />)
    expect(screen.getByTestId('cta-alerts')).toBeInTheDocument()
  })

  it('matches snapshot', () => {
    const { container } = render(<CTAAlertsPage />)
    expect(container).toMatchSnapshot()
  })
})
