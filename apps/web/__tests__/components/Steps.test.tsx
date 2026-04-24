import { render, screen } from '@testing-library/react'
import { Steps } from '@components/Steps'

const RED = '#c60c30'

describe('Steps', () => {
  it('renders one row per Steps.Item child with its children content', () => {
    render(
      <Steps color={RED}>
        <Steps.Item>Howard</Steps.Item>
        <Steps.Item>Jarvis</Steps.Item>
        <Steps.Item>95th</Steps.Item>
      </Steps>,
    )
    expect(screen.getByText('Howard')).toBeInTheDocument()
    expect(screen.getByText('Jarvis')).toBeInTheDocument()
    expect(screen.getByText('95th')).toBeInTheDocument()
  })
})
