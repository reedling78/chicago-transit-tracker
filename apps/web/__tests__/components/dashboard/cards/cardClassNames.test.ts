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

  it('exports the line-color chip token', () => {
    expect(cardChip).toContain('rounded')
    expect(cardChip).toContain('font-semibold')
  })
})
