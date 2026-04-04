import { render, screen, waitFor } from '@testing-library/react'
import MetraPositions from '@/app/components/MetraPositions'
import { fetchMetraFeed } from '../../app/lib/metra-realtime'

jest.mock('../../app/lib/metra-realtime')
const mockFetch = fetchMetraFeed as jest.MockedFunction<typeof fetchMetraFeed>

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers({
    doNotFake: [
      'setTimeout',
      'clearTimeout',
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

describe('MetraPositions', () => {
  it('shows loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<MetraPositions />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows entity count after successful fetch', async () => {
    mockFetch.mockResolvedValue({
      header: {},
      entity: [{ id: '1' }, { id: '2' }, { id: '3' }],
    } as never)
    render(<MetraPositions />)
    await waitFor(() => {
      expect(screen.getByText('3 entities — check console')).toBeInTheDocument()
    })
  })

  it('shows error message on failure', async () => {
    mockFetch.mockRejectedValue(new Error('Metra API error: 500'))
    render(<MetraPositions />)
    await waitFor(() => {
      expect(screen.getByText('Metra API error: 500')).toBeInTheDocument()
    })
  })

  it('calls fetchMetraFeed with positions', async () => {
    mockFetch.mockResolvedValue({ header: {}, entity: [] } as never)
    render(<MetraPositions />)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('positions')
    })
  })

  it('renders the Positions heading', () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<MetraPositions />)
    expect(screen.getByText('Positions')).toBeInTheDocument()
  })
})
