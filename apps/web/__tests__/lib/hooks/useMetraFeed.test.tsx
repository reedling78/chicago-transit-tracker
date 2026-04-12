import { act, render, waitFor } from '@testing-library/react'
import { useMetraFeed, __resetMetraFeedCache } from '@lib/hooks/useMetraFeed'
import { fetchMetraFeed } from '@lib/metra-realtime'

jest.mock('@lib/metra-realtime')
const mockFetch = fetchMetraFeed as jest.MockedFunction<typeof fetchMetraFeed>

const sampleFeed = { header: {}, entity: [] } as never

function Probe({
  enabled = true,
  intervalMs = 30_000,
  onResult,
}: {
  enabled?: boolean
  intervalMs?: number
  onResult: (r: ReturnType<typeof useMetraFeed>) => void
}) {
  const result = useMetraFeed('tripupdates', { enabled, intervalMs })
  onResult(result)
  return null
}

beforeEach(() => {
  jest.clearAllMocks()
  __resetMetraFeedCache()
  jest.useFakeTimers({
    doNotFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'setImmediate',
      'clearImmediate',
      'nextTick',
      'queueMicrotask',
      'Date',
      'performance',
    ],
  })
})

afterEach(() => {
  __resetMetraFeedCache()
  jest.useRealTimers()
})

describe('useMetraFeed', () => {
  it('issues a single fetch when two subscribers mount at the same time', async () => {
    mockFetch.mockResolvedValue(sampleFeed)
    const resultsA: ReturnType<typeof useMetraFeed>[] = []
    const resultsB: ReturnType<typeof useMetraFeed>[] = []

    render(
      <>
        <Probe onResult={(r) => resultsA.push(r)} />
        <Probe onResult={(r) => resultsB.push(r)} />
      </>,
    )

    await waitFor(() => {
      expect(resultsA[resultsA.length - 1]?.data).toBe(sampleFeed)
      expect(resultsB[resultsB.length - 1]?.data).toBe(sampleFeed)
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith('tripupdates')
  })

  it('second subscriber that mounts during an in-flight fetch shares the same promise', async () => {
    let resolveFirst: (value: typeof sampleFeed) => void = () => {}
    const firstCall = new Promise<typeof sampleFeed>((resolve) => {
      resolveFirst = resolve
    })
    mockFetch.mockReturnValueOnce(firstCall)

    const results: ReturnType<typeof useMetraFeed>[] = []
    const { rerender } = render(<Probe onResult={(r) => results.push(r)} />)

    // Second probe mounts while the first fetch is still pending.
    rerender(
      <>
        <Probe onResult={(r) => results.push(r)} />
        <Probe onResult={(r) => results.push(r)} />
      </>,
    )

    await act(async () => {
      resolveFirst(sampleFeed)
    })

    await waitFor(() => {
      expect(results[results.length - 1]?.data).toBe(sampleFeed)
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('propagates errors to every subscriber', async () => {
    mockFetch.mockRejectedValue(new Error('boom'))
    const results: ReturnType<typeof useMetraFeed>[] = []

    render(<Probe onResult={(r) => results.push(r)} />)

    await waitFor(() => {
      expect(results[results.length - 1]?.error).toBe('boom')
    })
    expect(results[results.length - 1]?.data).toBeNull()
  })

  it('stops polling once the last subscriber unmounts', async () => {
    mockFetch.mockResolvedValue(sampleFeed)
    const { unmount } = render(<Probe onResult={() => {}} />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    unmount()

    // After unmount, advance time well beyond the poll interval — no more
    // fetches should fire because the interval was cleared.
    await new Promise((r) => setTimeout(r, 50))
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('when enabled=false, does not subscribe or trigger a fetch', async () => {
    mockFetch.mockResolvedValue(sampleFeed)
    const results: ReturnType<typeof useMetraFeed>[] = []

    render(<Probe enabled={false} onResult={(r) => results.push(r)} />)

    await new Promise((r) => setTimeout(r, 20))
    expect(mockFetch).not.toHaveBeenCalled()
    expect(results[results.length - 1]?.loading).toBe(true)
  })

  it('pauses polling while the tab is hidden and resumes on visibility change', async () => {
    mockFetch.mockResolvedValue(sampleFeed)

    render(<Probe intervalMs={20} onResult={() => {}} />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    // Simulate tab hidden.
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    })

    // Wait past a couple of poll ticks — no new fetches because the tab is hidden.
    await new Promise((r) => setTimeout(r, 70))
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Flip back to visible and dispatch the event.
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })
})
