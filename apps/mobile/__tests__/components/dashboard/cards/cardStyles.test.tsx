import { renderHook } from '@testing-library/react-native'
import { useCardStyles } from '../../../../components/dashboard/cards/cardStyles'

// Without a ThemeProvider, useTheme() returns the default ThemeContext value
// (the dark theme). That's the right baseline for these assertions because
// today's mobile app ships dark-only; the light palette is exercised by
// theme.test.tsx.

describe('useCardStyles (dark)', () => {
  it('uses the dark-card row token consistent with the previous favorite sections', () => {
    const { result } = renderHook(() => useCardStyles())
    expect(result.current.row).toMatchObject({
      backgroundColor: '#1f2937',
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
    })
  })

  it('exposes the typographic tokens used by every card', () => {
    const { result } = renderHook(() => useCardStyles())
    expect(result.current.title).toMatchObject({
      color: '#ffffff',
      fontSize: 15,
      fontWeight: '600',
    })
    expect(result.current.subtitle).toMatchObject({ color: '#9ca3af', fontSize: 12 })
    expect(result.current.meta).toMatchObject({ color: '#9ca3af', fontSize: 12 })
  })

  it('exposes the pill-shaped line-color chip token', () => {
    const { result } = renderHook(() => useCardStyles())
    expect(result.current.chip).toMatchObject({ borderRadius: 9999 })
    expect(result.current.chipText).toMatchObject({ fontSize: 12, fontWeight: '700' })
  })
})
