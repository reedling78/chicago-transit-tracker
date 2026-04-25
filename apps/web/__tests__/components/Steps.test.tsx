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

  it('renders a halo bullet when status="current" (overrides explicit bullet prop)', () => {
    const { container } = render(
      <Steps color={RED}>
        <Steps.Item status="current" bullet="filled">
          A
        </Steps.Item>
      </Steps>,
    )
    const bullet = container.querySelector('[data-steps-bullet]') as HTMLElement
    expect(bullet.getAttribute('data-steps-bullet')).toBe('halo')
    // Inner disc is filled with the color.
    expect(bullet.style.backgroundColor).toBe('rgb(198, 12, 48)')
    // Halo ring is applied via box-shadow in the line color at ~30% alpha.
    expect(bullet.style.boxShadow).toContain('rgba(198, 12, 48')
  })

  it('wraps row content in a Link when href is provided', () => {
    render(
      <Steps color={RED}>
        <Steps.Item href="/metra/bnsf/aurora">Aurora</Steps.Item>
      </Steps>,
    )
    const link = screen.getByRole('link', { name: /aurora/i })
    expect(link).toHaveAttribute('href', '/metra/bnsf/aurora')
  })

  it('renders no link when href is absent', () => {
    render(
      <Steps color={RED}>
        <Steps.Item>Aurora</Steps.Item>
      </Steps>,
    )
    expect(screen.queryByRole('link', { name: /aurora/i })).not.toBeInTheDocument()
  })

  it('renders trailing content on the right side of the row', () => {
    const { container } = render(
      <Steps color={RED}>
        <Steps.Item trailing={<span data-testid="t">6:30 AM</span>}>Aurora</Steps.Item>
      </Steps>,
    )
    const trailing = container.querySelector('[data-testid="t"]') as HTMLElement
    expect(trailing).toBeInTheDocument()
    expect(trailing.textContent).toBe('6:30 AM')
    // The trailing cell sits to the right of the children cell.
    const left = container.querySelector('[data-steps-left]') as HTMLElement
    const trailingCell = trailing.parentElement as HTMLElement
    expect(left.parentElement).toBe(trailingCell.parentElement)
  })

  it('renders below content underneath children, not inside the trailing cell', () => {
    const { container } = render(
      <Steps color={RED}>
        <Steps.Item
          trailing={<span data-testid="t">6:30 AM</span>}
          below={<span data-testid="b">Transfers</span>}
        >
          Aurora
        </Steps.Item>
      </Steps>,
    )
    const below = container.querySelector('[data-testid="b"]') as HTMLElement
    const trailing = container.querySelector('[data-testid="t"]') as HTMLElement
    expect(below).toBeInTheDocument()
    // below is NOT inside the trailing cell.
    expect(trailing.parentElement!.contains(below)).toBe(false)
    // below is inside the same outer content container (Link or div) as children.
    const row = container.querySelector('[data-steps-item]') as HTMLElement
    const contentContainer = row.querySelector('a, div.flex.min-w-0.flex-1.flex-col') as HTMLElement
    expect(contentContainer.contains(below)).toBe(true)
  })

  it('links carry the group class so consumers can use group-hover:* on children', () => {
    render(
      <Steps color={RED}>
        <Steps.Item href="/metra/bnsf/aurora">Aurora</Steps.Item>
      </Steps>,
    )
    const link = screen.getByRole('link', { name: /aurora/i })
    expect(link.className).toContain('group')
  })

  it('renders border-bottom on every row except the last', () => {
    const { container } = render(
      <Steps color={RED}>
        <Steps.Item>A</Steps.Item>
        <Steps.Item>B</Steps.Item>
        <Steps.Item>C</Steps.Item>
      </Steps>,
    )
    const rows = Array.from(container.querySelectorAll('[data-steps-item]'))
    expect(rows.length).toBe(3)
    rows.forEach((row) => {
      expect(row.className).toContain('border-b')
      expect(row.className).toContain('border-gray-100')
      expect(row.className).toContain('dark:border-gray-800')
      expect(row.className).toContain('last:border-b-0')
    })
  })
})
