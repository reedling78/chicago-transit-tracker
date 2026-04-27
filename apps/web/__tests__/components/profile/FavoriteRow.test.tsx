import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { Favorite, Line, Station } from '@ctt/shared'

const mockToggle = jest.fn()
jest.mock('../../../app/lib/hooks/useToggleFavorite', () => ({
  useToggleFavorite: () => ({ toggle: mockToggle, isToggling: false }),
}))

const mockUseFavoriteTripQuery = jest.fn()
jest.mock('../../../app/lib/hooks/useDashboardQueries', () => ({
  useFavoriteTripQuery: (id: string | null) => mockUseFavoriteTripQuery(id),
}))

jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>
  }
})

import FavoriteRow from '../../../app/components/profile/FavoriteRow'

const lines: Line[] = [
  {
    slug: 'red',
    shortName: 'Red',
    name: 'Red Line',
    service: 'cta',
    color: '#c60c30',
    textColor: '#ffffff',
    termini: ['Howard', '95th/Dan Ryan'],
  } as unknown as Line,
  {
    slug: 'bnsf',
    shortName: 'BNSF',
    name: 'BNSF',
    service: 'metra',
    color: '#000',
    textColor: '#fff',
    termini: ['Aurora', 'Union Station'],
  } as unknown as Line,
]

const stations: Station[] = [
  {
    slug: 'clark-lake',
    name: 'Clark/Lake',
    service: 'cta',
    lines: ['Red', 'Blue'],
  } as unknown as Station,
]

beforeEach(() => {
  jest.clearAllMocks()
  mockUseFavoriteTripQuery.mockReturnValue({ data: null })
})

describe('FavoriteRow', () => {
  it('renders a line favorite with name and termini and a deep link', () => {
    const fav: Favorite = { type: 'line', id: 'red', addedAt: '2026-01-01T00:00:00Z' }
    render(<FavoriteRow favorite={fav} lines={lines} stations={stations} />)
    expect(screen.getByText('Red Line')).toBeInTheDocument()
    expect(screen.getByText('Howard — 95th/Dan Ryan')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/cta/red')
  })

  it('renders a station favorite with line list', () => {
    const fav: Favorite = { type: 'station', id: 'clark-lake', addedAt: '2026-01-01T00:00:00Z' }
    render(<FavoriteRow favorite={fav} lines={lines} stations={stations} />)
    expect(screen.getByText('Clark/Lake')).toBeInTheDocument()
    expect(screen.getByText('Red • Blue')).toBeInTheDocument()
  })

  it('renders a train favorite using trip data when available', () => {
    mockUseFavoriteTripQuery.mockReturnValue({
      data: { trainNumber: '1200', line: 'bnsf', headsign: 'Aurora' },
    })
    const fav: Favorite = { type: 'train', id: 'bnsf_1200', addedAt: '2026-01-01T00:00:00Z' }
    render(<FavoriteRow favorite={fav} lines={lines} stations={stations} />)
    expect(screen.getByText('Train 1200')).toBeInTheDocument()
    expect(screen.getByText('To Aurora')).toBeInTheDocument()
  })

  it('falls back to a placeholder subtitle when no trip is found', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: null })
    const fav: Favorite = { type: 'train', id: 'bnsf_1200', addedAt: '2026-01-01T00:00:00Z' }
    render(<FavoriteRow favorite={fav} lines={lines} stations={stations} />)
    expect(screen.getByText('Trip not currently scheduled')).toBeInTheDocument()
  })

  it('calls toggle when the trash button is clicked', () => {
    const fav: Favorite = { type: 'line', id: 'red', addedAt: '2026-01-01T00:00:00Z' }
    render(<FavoriteRow favorite={fav} lines={lines} stations={stations} />)
    fireEvent.click(screen.getByRole('button', { name: /Remove Red Line from favorites/i }))
    expect(mockToggle).toHaveBeenCalledTimes(1)
  })
})
