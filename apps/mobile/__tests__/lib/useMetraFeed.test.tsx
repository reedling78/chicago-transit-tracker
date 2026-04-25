import { Text } from 'react-native'
import { render, waitFor, act } from '@testing-library/react-native'
import { useMetraFeed, __resetMetraFeedCache } from '../../lib/useMetraFeed'

jest.mock('../../lib/config', () => ({
  FUNCTIONS_BASE_URL: 'https://test.cloudfunctions.net',
}))

// AppState mock — start in 'active' so polling runs. Override AppState only,
// leaving other RN exports (provided by jest-expo's preset) intact.
let mockAppState: 'active' | 'background' | 'inactive' = 'active'
const mockListeners = new Set<(s: string) => void>()
import { AppState as RNAppState } from 'react-native'
Object.defineProperty(RNAppState, 'currentState', {
  configurable: true,
  get: () => mockAppState,
})
RNAppState.addEventListener = ((_event: string, fn: (s: string) => void) => {
  mockListeners.add(fn)
  return { remove: () => mockListeners.delete(fn) }
}) as unknown as typeof RNAppState.addEventListener

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>
global.fetch = mockFetch

function FeedProbe({ feed }: { feed: 'tripupdates' | 'positions' }) {
  const { data, error, loading } = useMetraFeed(feed)
  if (loading) return <Text>loading</Text>
  if (error) return <Text>error:{error}</Text>
  return <Text>entities:{(data?.entity?.length ?? 0).toString()}</Text>
}

beforeEach(() => {
  __resetMetraFeedCache()
  mockFetch.mockReset()
  mockListeners.clear()
  mockAppState = 'active'
})

describe('useMetraFeed', () => {
  it('fetches the tripupdates Cloud Function endpoint and returns the JSON body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ entity: [{ id: 'a' }, { id: 'b' }] }),
    } as unknown as Response)

    const { getByText } = render(<FeedProbe feed="tripupdates" />)
    await waitFor(() => expect(getByText('entities:2')).toBeOnTheScreen())
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch.mock.calls[0][0]).toBe('https://test.cloudfunctions.net/metraTripUpdates')
  })

  it('uses the metraPositions endpoint when feed="positions"', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ entity: [] }),
    } as unknown as Response)

    render(<FeedProbe feed="positions" />)
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    expect(mockFetch.mock.calls[0][0]).toBe('https://test.cloudfunctions.net/metraPositions')
  })

  it('exposes an error string when the fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'))

    const { getByText } = render(<FeedProbe feed="tripupdates" />)
    await waitFor(() => expect(getByText('error:network down')).toBeOnTheScreen())
  })

  it('exposes an error string when the response is non-OK', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    } as unknown as Response)

    const { getByText } = render(<FeedProbe feed="tripupdates" />)
    await waitFor(() => expect(getByText('error:Metra tripupdates returned 500')).toBeOnTheScreen())
  })

  it('shares one fetch between two subscribers of the same feed', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ entity: [{ id: 'shared' }] }),
    } as unknown as Response)

    const { getAllByText } = render(
      <>
        <FeedProbe feed="tripupdates" />
        <FeedProbe feed="tripupdates" />
      </>,
    )
    await waitFor(() => expect(getAllByText('entities:1')).toHaveLength(2))
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('refetches when AppState transitions back to active', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ entity: [{ id: 'r' }] }),
    } as unknown as Response)

    const { getByText } = render(<FeedProbe feed="tripupdates" />)
    await waitFor(() => expect(getByText('entities:1')).toBeOnTheScreen())
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Simulate the app coming back to the foreground.
    await act(async () => {
      mockListeners.forEach((fn) => fn('active'))
    })

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
  })
})
