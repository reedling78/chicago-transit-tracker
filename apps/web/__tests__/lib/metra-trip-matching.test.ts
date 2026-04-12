import { extractMetraTrainNumber, routeIdToLineSlug } from '@lib/metra-trip-matching'

describe('extractMetraTrainNumber', () => {
  it('extracts the train number from an MD-W trip id', () => {
    expect(extractMetraTrainNumber('MD-W_MW2222_V2_A')).toBe('2222')
  })

  it('extracts the train number from a BNSF trip id', () => {
    expect(extractMetraTrainNumber('BNSF_BN1200_V4_A')).toBe('1200')
  })

  it('extracts the train number from an NCS trip id', () => {
    expect(extractMetraTrainNumber('NCS_NC100_V1_A')).toBe('100')
  })

  it('returns the original input when the pattern does not match', () => {
    expect(extractMetraTrainNumber('not-a-trip-id')).toBe('not-a-trip-id')
  })

  it('returns the original input when the second segment has no digits', () => {
    expect(extractMetraTrainNumber('BNSF_noDigitsHere_V1')).toBe('BNSF_noDigitsHere_V1')
  })

  it('returns the original input when given a single segment with no underscore', () => {
    expect(extractMetraTrainNumber('BNSF1200')).toBe('BNSF1200')
  })

  it('returns the original input for an empty string', () => {
    expect(extractMetraTrainNumber('')).toBe('')
  })

  it('extracts digits from a trip id that has extra leading underscores', () => {
    // The current implementation splits on underscore and looks at segments[1].
    // An empty leading segment still yields the same behavior as any other
    // non-digit second segment — return the input unchanged.
    expect(extractMetraTrainNumber('_BN1200_V4_A')).toBe('1200')
  })

  it('prefers the first run of digits in the second segment', () => {
    expect(extractMetraTrainNumber('BNSF_BN1200extra55_V4')).toBe('1200')
  })
})

describe('routeIdToLineSlug', () => {
  it('maps every Metra route id to its line slug', () => {
    expect(routeIdToLineSlug('BNSF')).toBe('bnsf')
    expect(routeIdToLineSlug('UP-N')).toBe('up-n')
    expect(routeIdToLineSlug('UP-NW')).toBe('up-nw')
    expect(routeIdToLineSlug('UP-W')).toBe('up-w')
    expect(routeIdToLineSlug('MD-N')).toBe('md-n')
    expect(routeIdToLineSlug('MD-W')).toBe('md-w')
    expect(routeIdToLineSlug('RI')).toBe('ri')
    expect(routeIdToLineSlug('SWS')).toBe('sws')
    expect(routeIdToLineSlug('HC')).toBe('hc')
    expect(routeIdToLineSlug('ME')).toBe('me')
    expect(routeIdToLineSlug('NCS')).toBe('ncs')
  })

  it('returns null for unknown route ids', () => {
    expect(routeIdToLineSlug('UNKNOWN')).toBeNull()
  })

  it('returns null for null or undefined', () => {
    expect(routeIdToLineSlug(null)).toBeNull()
    expect(routeIdToLineSlug(undefined)).toBeNull()
  })

  it('returns null for an empty string route id', () => {
    expect(routeIdToLineSlug('')).toBeNull()
  })

  it('is case-sensitive — a lowercased id is not in the map', () => {
    expect(routeIdToLineSlug('bnsf')).toBeNull()
  })
})
