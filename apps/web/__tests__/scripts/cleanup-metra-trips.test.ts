/**
 * @jest-environment node
 */

import { partitionMetraTripDocIds } from '../../scripts/cleanup-metra-trips'

describe('partitionMetraTripDocIds', () => {
  const lineSlugs = [
    'bnsf',
    'md-w',
    'ncs',
    'up-n',
    'up-nw',
    'up-w',
    'me',
    'hc',
    'rid',
    'sws',
    'mdn',
  ]

  it('keeps new-format docs matching a known line slug + numeric train number', () => {
    const { kept, stale } = partitionMetraTripDocIds(
      ['bnsf_1200', 'md-w_2222', 'ncs_100', 'up-n_500'],
      lineSlugs,
    )
    expect(kept).toEqual(['bnsf_1200', 'md-w_2222', 'ncs_100', 'up-n_500'])
    expect(stale).toEqual([])
  })

  it('marks old safeTripId-format docs as stale', () => {
    const { kept, stale } = partitionMetraTripDocIds(
      ['bnsf_bn1200_v4_a', 'bnsf_bn1200_v4_aa', 'bnsf_bn1200_v4_b', 'md-w_mw2222_v2_a'],
      lineSlugs,
    )
    expect(kept).toEqual([])
    expect(stale).toHaveLength(4)
  })

  it('partitions a mixed set correctly', () => {
    const { kept, stale } = partitionMetraTripDocIds(
      ['bnsf_1200', 'bnsf_bn1200_v4_a', 'md-w_2222', 'md-w_mw2222_v2_b'],
      lineSlugs,
    )
    expect(kept).toEqual(['bnsf_1200', 'md-w_2222'])
    expect(stale).toEqual(['bnsf_bn1200_v4_a', 'md-w_mw2222_v2_b'])
  })

  it('does not treat an unknown-line-slug doc as valid even if numeric', () => {
    const { kept, stale } = partitionMetraTripDocIds(['fake-line_1234'], lineSlugs)
    expect(kept).toEqual([])
    expect(stale).toEqual(['fake-line_1234'])
  })

  it('rejects a new-format-looking doc with trailing non-digit chars', () => {
    const { kept, stale } = partitionMetraTripDocIds(['bnsf_1200a', 'bnsf_12_34'], lineSlugs)
    expect(kept).toEqual([])
    expect(stale).toEqual(['bnsf_1200a', 'bnsf_12_34'])
  })

  it('handles hyphens in line slugs without breaking the regex', () => {
    const { kept } = partitionMetraTripDocIds(['up-nw_99', 'md-w_1'], ['up-nw', 'md-w'])
    expect(kept).toEqual(['up-nw_99', 'md-w_1'])
  })

  it('returns empty arrays for empty input', () => {
    const { kept, stale } = partitionMetraTripDocIds([], lineSlugs)
    expect(kept).toEqual([])
    expect(stale).toEqual([])
  })
})
