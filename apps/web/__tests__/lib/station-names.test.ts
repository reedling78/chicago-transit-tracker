import { STATION_DISPLAY_NAME_OVERRIDES, displayStationName } from '@ctt/shared'

describe('displayStationName', () => {
  it('maps the three required canonical names to their display names', () => {
    expect(displayStationName('Chicago Union Station')).toBe('Union Station')
    expect(displayStationName('Ogilvie Transportation Center')).toBe('Ogilvie TC')
    expect(displayStationName('Chicago OTC')).toBe('Ogilvie TC')
  })

  it('passes through names with no override unchanged', () => {
    expect(displayStationName('Aurora')).toBe('Aurora')
    expect(displayStationName('Naperville')).toBe('Naperville')
  })

  it('is idempotent (display targets are not themselves keys)', () => {
    expect(displayStationName(displayStationName('Chicago Union Station'))).toBe('Union Station')
    expect(displayStationName('Union Station')).toBe('Union Station')
    expect(displayStationName('Ogilvie TC')).toBe('Ogilvie TC')
  })

  it('is null/undefined/empty safe', () => {
    expect(displayStationName('')).toBe('')
    expect(displayStationName(null)).toBeNull()
    expect(displayStationName(undefined)).toBeUndefined()
  })

  it('exposes an extensible override map', () => {
    expect(STATION_DISPLAY_NAME_OVERRIDES['Chicago OTC']).toBe('Ogilvie TC')
    expect(Object.keys(STATION_DISPLAY_NAME_OVERRIDES)).toHaveLength(3)
  })
})
