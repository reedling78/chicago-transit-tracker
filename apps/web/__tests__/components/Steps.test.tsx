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

  it('makes the first item top-segment transparent and last item bottom-segment colored-transparent', () => {
    const { container } = render(
      <Steps color={RED}>
        <Steps.Item>A</Steps.Item>
        <Steps.Item>B</Steps.Item>
        <Steps.Item>C</Steps.Item>
      </Steps>,
    )
    const rows = container.querySelectorAll('[data-stop-sequence], [data-steps-item]')
    expect(rows.length).toBe(3)
    const firstTop = rows[0].querySelector('[data-rail-top]') as HTMLElement
    const firstBottom = rows[0].querySelector('[data-rail-bottom]') as HTMLElement
    const lastTop = rows[2].querySelector('[data-rail-top]') as HTMLElement
    const lastBottom = rows[2].querySelector('[data-rail-bottom]') as HTMLElement
    const middleTop = rows[1].querySelector('[data-rail-top]') as HTMLElement
    const middleBottom = rows[1].querySelector('[data-rail-bottom]') as HTMLElement

    expect(firstTop.style.backgroundColor).toBe('transparent')
    expect(firstBottom.style.backgroundColor).toBe('rgb(198, 12, 48)')
    expect(middleTop.style.backgroundColor).toBe('rgb(198, 12, 48)')
    expect(middleBottom.style.backgroundColor).toBe('rgb(198, 12, 48)')
    expect(lastTop.style.backgroundColor).toBe('rgb(198, 12, 48)')
    expect(lastBottom.style.backgroundColor).toBe('transparent')
  })
})
