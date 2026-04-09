import { render, screen, waitFor } from '@testing-library/react'
import MetraTripUpdates from '@/app/components/MetraTripUpdates'
import { fetchMetraFeed } from '../../app/lib/metra-realtime'

jest.mock('../../app/lib/metra-realtime')
const mockFetch = fetchMetraFeed as jest.MockedFunction<typeof fetchMetraFeed>

beforeEach(() => {
  jest.clearAllMocks()
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
    ],
  })
})

afterEach(() => {
  jest.useRealTimers()
})

describe('MetraTripUpdates', () => {
  it('shows loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<MetraTripUpdates />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows entity count after successful fetch', async () => {
    mockFetch.mockResolvedValue({ header: {}, entity: [{ id: '1' }] } as never)
    render(<MetraTripUpdates />)
    await waitFor(() => {
      expect(screen.getByText('1 entities — check console')).toBeInTheDocument()
    })
  })

  it('shows error message on failure', async () => {
    mockFetch.mockRejectedValue(new Error('NEXT_PUBLIC_METRA_API_TOKEN is not set'))
    render(<MetraTripUpdates />)
    await waitFor(() => {
      expect(screen.getByText('NEXT_PUBLIC_METRA_API_TOKEN is not set')).toBeInTheDocument()
    })
  })

  it('calls fetchMetraFeed with tripupdates', async () => {
    mockFetch.mockResolvedValue({ header: {}, entity: [] } as never)
    render(<MetraTripUpdates />)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('tripupdates')
    })
  })

  it('renders the Trip Updates heading', () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<MetraTripUpdates />)
    expect(screen.getByText('Trip Updates')).toBeInTheDocument()
  })
})
