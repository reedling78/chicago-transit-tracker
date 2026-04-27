/**
 * @jest-environment jsdom
 */
import { render, fireEvent, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { Favorite, StationSchedule } from '@ctt/shared'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('@lib/hooks/useToggleFavorite', () => ({
  useToggleFavorite: () => ({
    isFavorited: true,
    toggle: jest.fn(),
    isToggling: false,
    needsAuth: false,
  }),
}))

const mockUpdate = jest.fn()
jest.mock('@lib/hooks/useUpdateFavoriteSettings', () => ({
  useUpdateFavoriteSettings: () => ({ update: mockUpdate, isUpdating: false }),
}))

const mockScheduleQuery = jest.fn()
const mockTripsQuery = jest.fn()
jest.mock('@lib/hooks/useDashboardQueries', () => ({
  useStationScheduleQuery: (slug: string | null) => mockScheduleQuery(slug),
  useStationTripsQuery: (slug: string | null, enabled: boolean) => mockTripsQuery(slug, enabled),
}))

import StationCard from '@components/dashboard/cards/StationCard'
import { mockLine, mockMetraLine, mockStation, mockMetraStation } from '../../../fixtures'

const ctaFav: Favorite = { type: 'station', id: 'clark-lake', addedAt: '2026-04-25T10:00:00Z' }
const metraFav: Favorite = { type: 'station', id: 'aurora', addedAt: '2026-04-25T10:00:00Z' }

const ctaSchedule: StationSchedule = {
  directions: [
    {
      headsign: 'Loop',
      line: 'Red',
      weekday: [9999], // far in the future so this is the only "upcoming" item
      saturday: [9999],
      sunday: [9999],
    },
    {
      headsign: "O'Hare",
      line: 'Blue',
      weekday: [9999],
      saturday: [9999],
      sunday: [9999],
    },
  ],
}

function loadedSchedule(data: StationSchedule | null) {
  return { data, isLoading: false, dataUpdatedAt: 1714137000000 }
}

beforeEach(() => {
  mockPush.mockClear()
  mockUpdate.mockClear()
  mockScheduleQuery.mockReset()
  mockTripsQuery.mockReset()
  mockScheduleQuery.mockReturnValue({ data: null, isLoading: true, dataUpdatedAt: 0 })
  mockTripsQuery.mockReturnValue({ data: null, isLoading: false, dataUpdatedAt: 0 })
})

describe('StationCard', () => {
  it('renders title, lines subtitle, and CTA meta', () => {
    render(
      <ul>
        <StationCard favorite={ctaFav} station={mockStation} lines={[mockLine]} />
      </ul>,
    )
    expect(screen.getByText('Clark/Lake')).toBeInTheDocument()
    expect(
      screen.getByText('Red • Blue • Green • Brown • Purple • Pink • Orange'),
    ).toBeInTheDocument()
    expect(screen.getByText('CTA')).toBeInTheDocument()
  })

  it('renders Metra meta for Metra stations', () => {
    render(
      <ul>
        <StationCard favorite={metraFav} station={mockMetraStation} lines={[mockMetraLine]} />
      </ul>,
    )
    expect(screen.getByText('Metra')).toBeInTheDocument()
  })

  it('renders a link via favoriteRoute', () => {
    const { container } = render(
      <ul>
        <StationCard favorite={ctaFav} station={mockStation} lines={[mockLine]} />
      </ul>,
    )
    expect(container.querySelector('a[href="/cta/red/clark-lake"]')).not.toBeNull()
  })

  it('opens the menu on overflow click', () => {
    render(
      <ul>
        <StationCard favorite={ctaFav} station={mockStation} lines={[mockLine]} />
      </ul>,
    )
    fireEvent.click(screen.getByLabelText('Open menu for Clark/Lake'))
    expect(screen.getByText('Open details')).toBeInTheDocument()
  })

  it('falls back to the favorite id when station data has not loaded', () => {
    render(
      <ul>
        <StationCard favorite={ctaFav} station={undefined} lines={undefined} />
      </ul>,
    )
    expect(screen.getByText('clark-lake')).toBeInTheDocument()
  })

  it('shows skeleton while schedule is loading', () => {
    render(
      <ul>
        <StationCard favorite={ctaFav} station={mockStation} lines={[mockLine]} />
      </ul>,
    )
    expect(screen.getByTestId('arrivals-skeleton')).toBeInTheDocument()
  })

  it('renders expanded arrivals grouped by headsign', () => {
    mockScheduleQuery.mockReturnValue(loadedSchedule(ctaSchedule))
    render(
      <ul>
        <StationCard favorite={ctaFav} station={mockStation} lines={[mockLine]} />
      </ul>,
    )
    expect(screen.getByText('Toward Loop')).toBeInTheDocument()
    expect(screen.getByText("Toward O'Hare")).toBeInTheDocument()
    expect(screen.getAllByTestId('arrival-row')).toHaveLength(2)
  })

  it('renders compact rows when density is compact', () => {
    mockScheduleQuery.mockReturnValue(loadedSchedule(ctaSchedule))
    const compactFav: Favorite = { ...ctaFav, density: 'compact' }
    render(
      <ul>
        <StationCard favorite={compactFav} station={mockStation} lines={[mockLine]} />
      </ul>,
    )
    expect(screen.getAllByTestId('arrival-row-compact')).toHaveLength(2)
    expect(screen.queryByTestId('arrival-row')).toBeNull()
  })

  it('filters CTA arrivals by directionFilter headsign', () => {
    mockScheduleQuery.mockReturnValue(loadedSchedule(ctaSchedule))
    const filtered: Favorite = { ...ctaFav, directionFilter: 'Loop' }
    render(
      <ul>
        <StationCard favorite={filtered} station={mockStation} lines={[mockLine]} />
      </ul>,
    )
    expect(screen.getByText('Toward Loop')).toBeInTheDocument()
    expect(screen.queryByText("Toward O'Hare")).toBeNull()
  })

  it('renders empty state when schedule has no upcoming departures', () => {
    mockScheduleQuery.mockReturnValue(
      loadedSchedule({
        directions: [{ headsign: 'Loop', line: 'Red', weekday: [], saturday: [], sunday: [] }],
      }),
    )
    render(
      <ul>
        <StationCard favorite={ctaFav} station={mockStation} lines={[mockLine]} />
      </ul>,
    )
    expect(screen.getByText('No upcoming departures.')).toBeInTheDocument()
  })

  it('only enables Metra trips query for Metra stations', () => {
    mockScheduleQuery.mockReturnValue(loadedSchedule(ctaSchedule))
    render(
      <ul>
        <StationCard favorite={ctaFav} station={mockStation} lines={[mockLine]} />
      </ul>,
    )
    expect(mockTripsQuery).toHaveBeenCalledWith('clark-lake', false)
  })
})
