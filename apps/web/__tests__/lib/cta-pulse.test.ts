/**
 * @jest-environment node
 */
import {
  aggregateByTerminal,
  computeHealth,
  nextArrivalFor,
  terminalKeyFor,
  type PulseInputTrain,
} from '@lib/cta-pulse'

function t(overrides: Partial<PulseInputTrain>): PulseInputTrain {
  return {
    rn: '1',
    destNm: 'Howard',
    nextStaNm: 'Clark/Lake',
    arrTIso: '2026-04-11T08:03:00',
    isDly: false,
    ...overrides,
  }
}

describe('terminalKeyFor', () => {
  const termini = ['Howard', '95th/Dan Ryan']

  it('matches an exact terminal name', () => {
    expect(terminalKeyFor('Howard', termini)).toBe('Howard')
  })

  it('matches case-insensitively', () => {
    expect(terminalKeyFor('HOWARD', termini)).toBe('Howard')
  })

  it('returns null for an unmatched destination', () => {
    expect(terminalKeyFor('Forest Park', termini)).toBeNull()
  })

  it('handles slash-combined termini by matching either side', () => {
    // Green line terminus is "Cottage Grove / Ashland/63rd" — trains may show
    // either branch's own name as destNm.
    const green = ['Harlem/Lake', 'Cottage Grove / Ashland/63rd']
    expect(terminalKeyFor('Cottage Grove', green)).toBe('Cottage Grove / Ashland/63rd')
    expect(terminalKeyFor('Ashland/63rd', green)).toBe('Cottage Grove / Ashland/63rd')
    expect(terminalKeyFor('Harlem/Lake', green)).toBe('Harlem/Lake')
  })

  it('matches Loop to any loop terminal', () => {
    const brown = ['Kimball', 'Loop']
    expect(terminalKeyFor('Loop', brown)).toBe('Loop')
    expect(terminalKeyFor('Kimball', brown)).toBe('Kimball')
  })
})

describe('aggregateByTerminal', () => {
  const termini = ['Howard', '95th/Dan Ryan']

  it('groups trains by matching terminal', () => {
    const trains = [
      t({ rn: '1', destNm: 'Howard' }),
      t({ rn: '2', destNm: 'Howard', isDly: true }),
      t({ rn: '3', destNm: '95th/Dan Ryan' }),
    ]
    const groups = aggregateByTerminal(trains, termini)
    expect(groups.get('Howard')?.length).toBe(2)
    expect(groups.get('95th/Dan Ryan')?.length).toBe(1)
  })

  it('ignores trains that do not match any terminal', () => {
    const trains = [t({ destNm: 'Howard' }), t({ destNm: 'Mystery Station' })]
    const groups = aggregateByTerminal(trains, termini)
    expect(groups.get('Howard')?.length).toBe(1)
  })

  it('returns an empty array for terminals with no trains', () => {
    const groups = aggregateByTerminal([t({ destNm: 'Howard' })], termini)
    expect(groups.get('95th/Dan Ryan')).toEqual([])
  })
})

describe('nextArrivalFor', () => {
  it('returns the train with the smallest arrival time', () => {
    const trains = [
      t({ rn: '1', arrTIso: '2026-04-11T08:10:00', nextStaNm: 'A' }),
      t({ rn: '2', arrTIso: '2026-04-11T08:05:00', nextStaNm: 'B' }),
      t({ rn: '3', arrTIso: '2026-04-11T08:15:00', nextStaNm: 'C' }),
    ]
    const now = new Date('2026-04-11T08:03:00').getTime()
    const result = nextArrivalFor(trains, now)
    expect(result?.minutes).toBe(2)
    expect(result?.nearStation).toBe('B')
  })

  it('returns null for an empty list', () => {
    expect(nextArrivalFor([], Date.now())).toBeNull()
  })

  it('clamps to 0 when the eta is already past', () => {
    const trains = [t({ arrTIso: '2026-04-11T08:00:00', nextStaNm: 'Already there' })]
    const now = new Date('2026-04-11T08:05:00').getTime()
    expect(nextArrivalFor(trains, now)?.minutes).toBe(0)
  })
})

describe('computeHealth', () => {
  it('returns normal when there are 3+ trains, 0 delayed, no alert', () => {
    expect(
      computeHealth({ trainCount: 4, delayedCount: 0, hasHighAlert: false, inService: true }),
    ).toEqual({ tone: 'normal', label: 'Running normally' })
  })

  it('returns minor when 1-2 trains are active', () => {
    expect(
      computeHealth({ trainCount: 2, delayedCount: 0, hasHighAlert: false, inService: true }).tone,
    ).toBe('minor')
  })

  it('returns minor when any train is delayed', () => {
    expect(
      computeHealth({ trainCount: 5, delayedCount: 1, hasHighAlert: false, inService: true }).tone,
    ).toBe('minor')
  })

  it('returns minor when a high-severity alert is present', () => {
    expect(
      computeHealth({ trainCount: 5, delayedCount: 0, hasHighAlert: true, inService: true }).tone,
    ).toBe('minor')
  })

  it('returns major when majority of trains are delayed', () => {
    expect(
      computeHealth({ trainCount: 4, delayedCount: 3, hasHighAlert: false, inService: true }).tone,
    ).toBe('major')
  })

  it('returns major when in service but no trains are running', () => {
    expect(
      computeHealth({ trainCount: 0, delayedCount: 0, hasHighAlert: false, inService: true }).tone,
    ).toBe('major')
  })

  it('returns no-service when outside service hours with no trains', () => {
    expect(
      computeHealth({ trainCount: 0, delayedCount: 0, hasHighAlert: false, inService: false }).tone,
    ).toBe('no-service')
  })
})
