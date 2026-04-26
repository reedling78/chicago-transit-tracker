/**
 * @jest-environment jsdom
 */
import { render, fireEvent, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { Favorite } from '@ctt/shared'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockUseFavoriteTripQuery = jest.fn()
jest.mock('@lib/hooks/useDashboardQueries', () => ({
  useFavoriteTripQuery: (tripId: string | null) => mockUseFavoriteTripQuery(tripId),
}))

jest.mock('@lib/hooks/useToggleFavorite', () => ({
  useToggleFavorite: () => ({
    isFavorited: true,
    toggle: jest.fn(),
    isToggling: false,
    needsAuth: false,
  }),
}))

import TrainCard from '@components/dashboard/cards/TrainCard'

const fav: Favorite = { type: 'train', id: 'bnsf_1234', addedAt: '2026-04-25T10:00:00Z' }

beforeEach(() => {
  mockPush.mockClear()
  mockUseFavoriteTripQuery.mockReset()
})

describe('TrainCard', () => {
  it('renders the train number, headsign subtitle, and service-type meta', () => {
    mockUseFavoriteTripQuery.mockReturnValue({
      data: {
        trainNumber: '1234',
        line: 'BNSF',
        lineName: 'BNSF',
        headsign: 'Chicago',
        serviceType: 'Weekday',
      },
    })
    render(
      <ul>
        <TrainCard favorite={fav} lines={undefined} stations={undefined} />
      </ul>,
    )
    expect(screen.getByText('Train 1234')).toBeInTheDocument()
    expect(screen.getByText('To Chicago')).toBeInTheDocument()
    expect(screen.getByText('Weekday')).toBeInTheDocument()
  })

  it('shows the placeholder subtitle when trip data is missing', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: null })
    render(
      <ul>
        <TrainCard
          favorite={{ type: 'train', id: 'bnsf_9999', addedAt: '2026-04-25T10:00:00Z' }}
          lines={undefined}
          stations={undefined}
        />
      </ul>,
    )
    expect(screen.getByText('Train 9999')).toBeInTheDocument()
    expect(screen.getByText('Trip not currently scheduled')).toBeInTheDocument()
  })

  it('renders a link to /metra/{line}/train/{trainNumber}', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: null })
    const { container } = render(
      <ul>
        <TrainCard favorite={fav} lines={undefined} stations={undefined} />
      </ul>,
    )
    expect(container.querySelector('a[href="/metra/bnsf/train/1234"]')).not.toBeNull()
  })

  it('opens the menu on overflow click', () => {
    mockUseFavoriteTripQuery.mockReturnValue({ data: null })
    render(
      <ul>
        <TrainCard favorite={fav} lines={undefined} stations={undefined} />
      </ul>,
    )
    fireEvent.click(screen.getByLabelText('Open menu for Train 1234'))
    expect(screen.getByText('Open details')).toBeInTheDocument()
  })
})
