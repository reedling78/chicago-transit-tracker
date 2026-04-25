/**
 * @jest-environment jsdom
 */
import { getQueryClient, makeQueryClient } from '@lib/queryClient'

describe('queryClient', () => {
  it('makeQueryClient returns a fresh client every call', () => {
    const a = makeQueryClient()
    const b = makeQueryClient()
    expect(a).not.toBe(b)
  })

  it('makeQueryClient applies sane defaults', () => {
    const client = makeQueryClient()
    const defaults = client.getDefaultOptions()
    expect(defaults.queries?.retry).toBe(1)
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false)
    expect(defaults.queries?.staleTime).toBe(60 * 1000)
  })

  it('getQueryClient returns the same client across calls in the browser', () => {
    const a = getQueryClient()
    const b = getQueryClient()
    expect(a).toBe(b)
  })
})
