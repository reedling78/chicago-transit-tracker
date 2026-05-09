import { darkTheme, lightTheme, themes } from '../../lib/theme/tokens'

describe('theme tokens', () => {
  it('exports light and dark themes with the same shape', () => {
    expect(Object.keys(lightTheme).sort()).toEqual(Object.keys(darkTheme).sort())
    expect(Object.keys(lightTheme.colors).sort()).toEqual(Object.keys(darkTheme.colors).sort())
    expect(Object.keys(lightTheme.colors.bg).sort()).toEqual(
      Object.keys(darkTheme.colors.bg).sort(),
    )
    expect(Object.keys(lightTheme.colors.text).sort()).toEqual(
      Object.keys(darkTheme.colors.text).sort(),
    )
    expect(Object.keys(lightTheme.colors.border).sort()).toEqual(
      Object.keys(darkTheme.colors.border).sort(),
    )
    expect(Object.keys(lightTheme.colors.status).sort()).toEqual(
      Object.keys(darkTheme.colors.status).sort(),
    )
  })

  it('preserves the existing dark mobile palette so round 1 is a pure refactor', () => {
    expect(darkTheme.colors.bg.canvas).toBe('#0f0f1e')
    expect(darkTheme.colors.bg.surface).toBe('#1f2937')
    expect(darkTheme.colors.bg.elevated).toBe('#111827')
    expect(darkTheme.colors.text.primary).toBe('#ffffff')
    expect(darkTheme.colors.text.secondary).toBe('#9ca3af')
    expect(darkTheme.colors.border.subtle).toBe('#374151')
  })

  it('shares status colors between modes (status signals state, not theme)', () => {
    expect(lightTheme.colors.status).toEqual(darkTheme.colors.status)
  })

  it('keeps onScrim/onScrimMuted near-white in both modes (photos are always dark)', () => {
    expect(lightTheme.colors.text.onScrim).toBe('#ffffff')
    expect(darkTheme.colors.text.onScrim).toBe('#ffffff')
    expect(lightTheme.colors.text.onScrimMuted).toMatch(/^rgba\(255,255,255/)
    expect(darkTheme.colors.text.onScrimMuted).toMatch(/^rgba\(255,255,255/)
  })

  it('exposes themes by mode via the `themes` map', () => {
    expect(themes.light).toBe(lightTheme)
    expect(themes.dark).toBe(darkTheme)
  })

  it('uses a 4-pt spacing scale', () => {
    expect(darkTheme.space[1]).toBe(4)
    expect(darkTheme.space[2]).toBe(8)
    expect(darkTheme.space[3]).toBe(12)
    expect(darkTheme.space[4]).toBe(16)
    expect(darkTheme.space[6]).toBe(24)
  })
})
