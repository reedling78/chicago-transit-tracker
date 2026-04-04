import { render, screen, waitFor } from '@testing-library/react'
import MetraAlerts from '@/app/components/MetraAlerts'
import { fetchMetraFeed } from '../../app/lib/metra-realtime'

jest.mock('../../app/lib/metra-realtime')
const mockFetch = fetchMetraFeed as jest.MockedFunction<typeof fetchMetraFeed>

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers({
    doNotFake: ['setTimeout', 'clearTimeout', 'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask'],
  })
})

afterEach(() => {
  jest.useRealTimers()
})

describe('MetraAlerts', () => {
  it('shows loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<MetraAlerts />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows entity count after successful fetch', async () => {
    mockFetch.mockResolvedValue({ header: {}, entity: [{ id: '1' }, { id: '2' }] } as never)
    render(<MetraAlerts />)
    await waitFor(() => {
      expect(screen.getByText('2 entities — check console')).toBeInTheDocument()
    })
  })

  it('shows error message on failure', async () => {
    mockFetch.mockRejectedValue(new Error('Metra API error: 401'))
    render(<MetraAlerts />)
    await waitFor(() => {
      expect(screen.getByText('Metra API error: 401')).toBeInTheDocument()
    })
  })

  it('calls fetchMetraFeed with alerts', async () => {
    mockFetch.mockResolvedValue({ header: {}, entity: [] } as never)
    render(<MetraAlerts />)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('alerts')
    })
  })

  it('renders the Alerts heading', () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<MetraAlerts />)
    expect(screen.getByText('Alerts')).toBeInTheDocument()
  })
})
