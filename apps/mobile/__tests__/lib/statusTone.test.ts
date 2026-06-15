import { tonePalette } from '../../lib/theme/statusTone'
import { lightTheme } from '../../lib/theme'

describe('tonePalette', () => {
  it('maps ontime and early to the on-time status color', () => {
    expect(tonePalette('ontime', lightTheme).dot).toBe(lightTheme.colors.status.onTime)
    expect(tonePalette('early', lightTheme).dot).toBe(lightTheme.colors.status.onTime)
  })

  it('maps delayed to the delayed status color', () => {
    expect(tonePalette('delayed', lightTheme).text).toBe(lightTheme.colors.status.delayed)
  })

  it('maps completed and nodata to the neutral status color', () => {
    expect(tonePalette('completed', lightTheme).dot).toBe(lightTheme.colors.status.neutral)
    expect(tonePalette('nodata', lightTheme).dot).toBe(lightTheme.colors.status.neutral)
  })

  it('maps scheduled to the scheduled status color', () => {
    expect(tonePalette('scheduled', lightTheme).dot).toBe(lightTheme.colors.status.scheduled)
  })
})
