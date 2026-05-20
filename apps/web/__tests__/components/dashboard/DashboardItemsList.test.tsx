/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockUseAuth = jest.fn()
jest.mock('@components/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const mockLinesQuery = jest.fn()
const mockStationsQuery = jest.fn()
const mockTripQuery = jest.fn()
jest.mock('@lib/hooks/useDashboardQueries', () => ({
  useLinesQuery: () => mockLinesQuery(),
  useStationsQuery: () => mockStationsQuery(),
  useDashboardItemTripQuery: (id: string | null) => mockTripQuery(id),
}))

import DashboardItemsList from '@components/dashboard/DashboardItemsList'
import { useDashboardStore } from '@lib/store/dashboard'
import { mockLine, mockMetraLine, mockStation, mockMetraStation } from '../../fixtures'

beforeEach(() => {
  jest.clearAllMocks()
  useDashboardStore.setState({ items: [], hydrated: false, pendingWrites: 0 })
  mockLinesQuery.mockReturnValue({ data: [mockLine, mockMetraLine] })
  mockStationsQuery.mockReturnValue({ data: [mockStation, mockMetraStation] })
  // Default: no trip loaded yet — train rows fall back to "Train {n}".
  mockTripQuery.mockReturnValue({ data: null })
})

describe('DashboardItemsList', () => {
  it('renders nothing when signed out', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    const { container } = render(<DashboardItemsList />)
    expect(container.firstChild).toBeNull()
  })

  it('shows an empty-state hint when authenticated but no items', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    render(<DashboardItemsList />)
    expect(screen.getByText('Dashboard items')).toBeInTheDocument()
    expect(screen.getByText(/Open any line, station, or train/)).toBeInTheDocument()
  })

  it('groups items by type in order Trains / Stations / Lines', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    useDashboardStore.setState({
      items: [
        { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' },
        { type: 'station', id: 'clark-lake', addedAt: '2026-04-25T11:00:00Z' },
        { type: 'train', id: 'bnsf_1234', addedAt: '2026-04-25T12:00:00Z' },
      ],
    })
    render(<DashboardItemsList />)
    const headings = screen.getAllByRole('heading', { level: 3 })
    expect(headings.map((h) => h.textContent)).toEqual(['Trains', 'Stations', 'Lines'])
  })

  it('renders a station row with a working link to the station page', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    useDashboardStore.setState({
      items: [{ type: 'station', id: 'clark-lake', addedAt: '2026-04-25T11:00:00Z' }],
    })
    render(<DashboardItemsList />)
    const link = screen.getByRole('link', { name: /Clark\/Lake/ })
    expect(link).toHaveAttribute('href', '/cta/red/clark-lake')
  })

  it('falls back to "Train {n}" while the trip is still loading', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    mockTripQuery.mockReturnValue({ data: null })
    useDashboardStore.setState({
      items: [{ type: 'train', id: 'bnsf_1234', addedAt: '2026-04-25T12:00:00Z' }],
    })
    render(<DashboardItemsList />)
    expect(screen.getByText('Train 1234')).toBeInTheDocument()
    expect(screen.getByText('BNSF #1234')).toBeInTheDocument()
  })

  it('renders origin → destination as the train row title once the trip resolves', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    mockTripQuery.mockReturnValue({
      data: {
        trainNumber: '1234',
        line: 'BNSF',
        lineSlug: 'bnsf',
        stops: [
          { slug: 'union-station', stationName: 'Chicago Union Station', departure: '5:42 PM' },
          { slug: 'naperville', stationName: 'Naperville', departure: '6:18 PM' },
          { slug: 'aurora', stationName: 'Aurora', departure: '6:42 PM' },
        ],
      },
    })
    useDashboardStore.setState({
      items: [{ type: 'train', id: 'bnsf_1234', addedAt: '2026-04-25T12:00:00Z' }],
    })
    render(<DashboardItemsList />)
    expect(screen.getByText('Union Station to Aurora')).toBeInTheDocument()
    expect(screen.getByText('BNSF #1234')).toBeInTheDocument()
  })

  it('honors per-item origin/destination overrides', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    mockTripQuery.mockReturnValue({
      data: {
        trainNumber: '1234',
        line: 'BNSF',
        lineSlug: 'bnsf',
        stops: [
          { slug: 'union-station', stationName: 'Chicago Union Station', departure: '5:42 PM' },
          { slug: 'naperville', stationName: 'Naperville', departure: '6:18 PM' },
          { slug: 'aurora', stationName: 'Aurora', departure: '6:42 PM' },
        ],
      },
    })
    useDashboardStore.setState({
      items: [
        {
          type: 'train',
          id: 'bnsf_1234',
          addedAt: '2026-04-25T12:00:00Z',
          trainOriginStopSlug: 'naperville',
          trainDestinationStopSlug: 'aurora',
        },
      ],
    })
    render(<DashboardItemsList />)
    expect(screen.getByText('Naperville to Aurora')).toBeInTheDocument()
  })

  it('skips section headings for empty groups', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    useDashboardStore.setState({
      items: [{ type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }],
    })
    render(<DashboardItemsList />)
    expect(screen.queryByText('Trains')).not.toBeInTheDocument()
    expect(screen.queryByText('Stations')).not.toBeInTheDocument()
    expect(screen.getByText('Lines')).toBeInTheDocument()
  })
})
