import { cardStyles } from '../../../../components/dashboard/cards/cardStyles'

describe('cardStyles', () => {
  it('uses the dark-card row token consistent with the previous favorite sections', () => {
    expect(cardStyles.row).toMatchObject({
      backgroundColor: '#1f2937',
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
    })
  })

  it('exports the typographic tokens used by every card', () => {
    expect(cardStyles.title).toMatchObject({ color: '#fff', fontSize: 15, fontWeight: '600' })
    expect(cardStyles.subtitle).toMatchObject({ color: '#9ca3af', fontSize: 12 })
    expect(cardStyles.meta).toMatchObject({ color: '#9ca3af', fontSize: 12 })
  })

  it('exports the line-color chip token', () => {
    expect(cardStyles.chip).toMatchObject({ borderRadius: 999 })
    expect(cardStyles.chipText).toMatchObject({ fontSize: 12, fontWeight: '700' })
  })
})
