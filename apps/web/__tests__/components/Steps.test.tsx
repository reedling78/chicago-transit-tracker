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
    const rows = container.querySelectorAll('[data-steps-item]')
    expect(rows.length).toBe(3)
    const firstTop = rows[0].querySelector('[data-steps-rail-top]') as HTMLElement
    const firstBottom = rows[0].querySelector('[data-steps-rail-bottom]') as HTMLElement
    const lastTop = rows[2].querySelector('[data-steps-rail-top]') as HTMLElement
    const lastBottom = rows[2].querySelector('[data-steps-rail-bottom]') as HTMLElement
    const middleTop = rows[1].querySelector('[data-steps-rail-top]') as HTMLElement
    const middleBottom = rows[1].querySelector('[data-steps-rail-bottom]') as HTMLElement

    expect(firstTop.style.backgroundColor).toBe('transparent')
    expect(firstBottom.style.backgroundColor).toBe('rgb(198, 12, 48)')
    expect(middleTop.style.backgroundColor).toBe('rgb(198, 12, 48)')
    expect(middleBottom.style.backgroundColor).toBe('rgb(198, 12, 48)')
    expect(lastTop.style.backgroundColor).toBe('rgb(198, 12, 48)')
    expect(lastBottom.style.backgroundColor).toBe('transparent')
  })

  it('renders an open bullet by default (12px, white/dark inner fill, colored border)', () => {
    const { container } = render(
      <Steps color={RED}>
        <Steps.Item>A</Steps.Item>
      </Steps>,
    )
    const bullet = container.querySelector('[data-steps-bullet]') as HTMLElement
    expect(bullet.getAttribute('data-steps-bullet')).toBe('open')
    expect(bullet.className).toContain('h-3')
    expect(bullet.className).toContain('w-3')
    expect(bullet.className).toContain('bg-white')
    expect(bullet.style.borderColor).toBe('rgb(198, 12, 48)')
    expect(bullet.style.backgroundColor).toBe('')
  })

  it('renders a filled bullet when bullet="filled"', () => {
    const { container } = render(
      <Steps color={RED}>
        <Steps.Item bullet="filled">A</Steps.Item>
      </Steps>,
    )
    const bullet = container.querySelector('[data-steps-bullet]') as HTMLElement
    expect(bullet.getAttribute('data-steps-bullet')).toBe('filled')
    expect(bullet.className).toContain('h-5')
    expect(bullet.className).toContain('w-5')
    expect(bullet.className).not.toContain('bg-white')
    expect(bullet.style.backgroundColor).toBe('rgb(198, 12, 48)')
    expect(bullet.style.borderColor).toBe('rgb(198, 12, 48)')
  })

  it('applies opacity-60 on past rows', () => {
    const { container } = render(
      <Steps color={RED}>
        <Steps.Item status="past">A</Steps.Item>
      </Steps>,
    )
    const row = container.querySelector('[data-steps-item]') as HTMLElement
    expect(row.className).toContain('opacity-60')
  })

  it('applies opacity-60 and line-through wrapper on skipped rows', () => {
    const { container } = render(
      <Steps color={RED}>
        <Steps.Item status="skipped">A</Steps.Item>
      </Steps>,
    )
    const row = container.querySelector('[data-steps-item]') as HTMLElement
    expect(row.className).toContain('opacity-60')
    const leftWrap = row.querySelector('[data-steps-left]') as HTMLElement
    expect(leftWrap.className).toContain('line-through')
  })

  it('tints current rows with 8% alpha of the line color', () => {
    const { container } = render(
      <Steps color={RED}>
        <Steps.Item status="current">A</Steps.Item>
      </Steps>,
    )
    const row = container.querySelector('[data-steps-item]') as HTMLElement
    // `${RED}14` — 8% alpha suffix
    expect(row.style.backgroundColor).not.toBe('')
  })
})
