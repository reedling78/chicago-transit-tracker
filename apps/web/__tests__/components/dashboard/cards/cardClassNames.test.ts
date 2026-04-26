import {
  cardRow,
  cardRowDragging,
  cardLink,
  cardTitle,
  cardSubtitle,
  cardMeta,
  cardChip,
} from '@components/dashboard/cards/cardClassNames'

describe('cardClassNames', () => {
  it('uses LinkCard’s row tokens (rounded-lg, border, bg-white, dark variants)', () => {
    expect(cardRow).toContain('rounded-lg')
    expect(cardRow).toContain('border')
    expect(cardRow).toContain('bg-white')
    expect(cardRow).toContain('dark:bg-gray-900')
    expect(cardRow).toContain('hover:shadow-md')
  })

  it('exports a distinct dragging modifier', () => {
    expect(cardRowDragging).toContain('opacity')
    expect(cardRowDragging).toContain('ring')
    expect(cardRowDragging).toContain('cursor-grabbing')
  })

  it('exports the typographic tokens used by every card', () => {
    expect(cardLink).toContain('flex')
    expect(cardLink).toContain('min-w-0')
    expect(cardTitle).toContain('font-medium')
    expect(cardSubtitle).toContain('text-gray-500')
    expect(cardMeta).toContain('text-gray-400')
  })

  it('marks the listener-bearing surface with touch-none for mobile-web drag', () => {
    // Without touch-action: none, mobile browsers preempt long-press as a
    // scroll gesture and dnd-kit's TouchSensor never activates. Guard against
    // accidentally removing this class.
    expect(cardLink).toContain('touch-none')
  })

  it('exports the line-color chip token', () => {
    expect(cardChip).toContain('rounded')
    expect(cardChip).toContain('font-semibold')
  })
})
