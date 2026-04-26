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

// Avoid pulling the real useToggleFavorite (which imports firebase) into the
// FavoriteMenu render path during these tests.
jest.mock('@lib/hooks/useToggleFavorite', () => ({
  useToggleFavorite: () => ({
    isFavorited: true,
    toggle: jest.fn(),
    isToggling: false,
    needsAuth: false,
  }),
}))

import LineCard from '@components/dashboard/cards/LineCard'
import { mockLine } from '../../../fixtures'

const fav: Favorite = { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }

beforeEach(() => {
  mockPush.mockClear()
})

describe('LineCard', () => {
  it('renders the line name and termini subtitle', () => {
    render(
      <ul>
        <LineCard favorite={fav} line={mockLine} lines={[mockLine]} />
      </ul>,
    )
    expect(screen.getByText('Red Line')).toBeInTheDocument()
    expect(screen.getByText('Howard — 95th/Dan Ryan')).toBeInTheDocument()
  })

  it('renders a working link to the line route', () => {
    const { container } = render(
      <ul>
        <LineCard favorite={fav} line={mockLine} lines={[mockLine]} />
      </ul>,
    )
    const link = container.querySelector('a[href="/cta/red"]')
    expect(link).not.toBeNull()
  })

  it('opens the menu when the overflow button is clicked', () => {
    render(
      <ul>
        <LineCard favorite={fav} line={mockLine} lines={[mockLine]} />
      </ul>,
    )
    expect(screen.queryByText('Open details')).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Open menu for Red Line'))
    expect(screen.getByText('Open details')).toBeInTheDocument()
    expect(screen.getByText('Remove from favorites')).toBeInTheDocument()
  })

  it('falls back to the favorite id when the line has not loaded yet', () => {
    render(
      <ul>
        <LineCard favorite={fav} line={undefined} lines={undefined} />
      </ul>,
    )
    expect(screen.getByText('red')).toBeInTheDocument()
  })

  it('renders a left accent border (jsdom normalizes the color to rgb())', () => {
    // mockLine.color = #c60c30 → rgb(198, 12, 48)
    const { container } = render(
      <ul>
        <LineCard favorite={fav} line={mockLine} lines={[mockLine]} />
      </ul>,
    )
    const li = container.querySelector('li')
    expect(li?.style.borderLeft).toBe('4px solid rgb(198, 12, 48)')
  })
})
