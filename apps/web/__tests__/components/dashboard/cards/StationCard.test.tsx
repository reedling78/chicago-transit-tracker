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

jest.mock('@lib/hooks/useToggleFavorite', () => ({
  useToggleFavorite: () => ({
    isFavorited: true,
    toggle: jest.fn(),
    isToggling: false,
    needsAuth: false,
  }),
}))

import StationCard from '@components/dashboard/cards/StationCard'
import { mockLine, mockMetraLine, mockStation, mockMetraStation } from '../../../fixtures'

const ctaFav: Favorite = { type: 'station', id: 'clark-lake', addedAt: '2026-04-25T10:00:00Z' }
const metraFav: Favorite = { type: 'station', id: 'aurora', addedAt: '2026-04-25T10:00:00Z' }

beforeEach(() => {
  mockPush.mockClear()
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
})
