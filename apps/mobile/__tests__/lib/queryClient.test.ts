import { getQueryClient, makeQueryClient } from '../../lib/queryClient'

describe('queryClient (mobile)', () => {
  it('makeQueryClient returns a fresh client every call', () => {
    expect(makeQueryClient()).not.toBe(makeQueryClient())
  })

  it('makeQueryClient applies sane defaults', () => {
    const client = makeQueryClient()
    const defaults = client.getDefaultOptions()
    expect(defaults.queries?.retry).toBe(1)
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false)
    expect(defaults.queries?.staleTime).toBe(60 * 1000)
  })

  it('getQueryClient returns the same client across calls', () => {
    expect(getQueryClient()).toBe(getQueryClient())
  })
})
