import { deriveRegion, deriveServiceType } from '@functions/lib/parsers/pace-schedules'

describe('deriveServiceType', () => {
  it('classifies Pulse routes by short name suffix', () => {
    expect(deriveServiceType({ route_short_name: 'Milwaukee Pulse', route_long_name: '' })).toBe(
      'pulse',
    )
    expect(deriveServiceType({ route_short_name: 'Dempster Pulse', route_long_name: '' })).toBe(
      'pulse',
    )
  })

  it('classifies express routes by long name', () => {
    expect(
      deriveServiceType({ route_short_name: '755', route_long_name: 'Plainfield-IMD Express' }),
    ).toBe('express')
  })

  it('classifies feeder routes by leading digit 8', () => {
    expect(deriveServiceType({ route_short_name: '890', route_long_name: 'Feeder' })).toBe('feeder')
  })

  it('defaults to local for regular numbered routes', () => {
    expect(deriveServiceType({ route_short_name: '208', route_long_name: 'Golf Road' })).toBe(
      'local',
    )
    expect(deriveServiceType({ route_short_name: '626', route_long_name: 'Evanston CTA' })).toBe(
      'local',
    )
  })
})

describe('deriveRegion', () => {
  it('maps route 208 to north', () => {
    expect(deriveRegion('208')).toBe('north')
  })

  it('maps route 353 to northwest', () => {
    expect(deriveRegion('353')).toBe('northwest')
  })

  it('maps route 423 to west', () => {
    expect(deriveRegion('423')).toBe('west')
  })

  it('maps route 513 to southwest', () => {
    expect(deriveRegion('513')).toBe('southwest')
  })

  it('maps route 633 to south', () => {
    expect(deriveRegion('633')).toBe('south')
  })

  it('maps 9xx routes to heritage', () => {
    expect(deriveRegion('904')).toBe('heritage')
  })

  it('defaults to north for unrecognized patterns', () => {
    expect(deriveRegion('ABC')).toBe('north')
  })

  it('defaults 8xx feeder routes to north', () => {
    expect(deriveRegion('890')).toBe('north')
  })
})
