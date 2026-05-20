/**
 * @jest-environment jsdom
 */
import { render, fireEvent, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { DashboardItem, StationSchedule } from '@ctt/shared'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockToggle = jest.fn()
jest.mock('@lib/hooks/useToggleDashboardItem', () => ({
  useToggleDashboardItem: () => ({
    isOnDashboard: true,
    toggle: mockToggle,
    isToggling: false,
    needsAuth: false,
  }),
}))

const mockUpdate = jest.fn()
jest.mock('@lib/hooks/useUpdateDashboardItemSettings', () => ({
  useUpdateDashboardItemSettings: () => ({ update: mockUpdate, isUpdating: false }),
}))

import DashboardItemMenu from '@components/dashboard/DashboardItemMenu'
import { useDashboardStore } from '@lib/store/dashboard'
import { mockLine, mockMetraLine, mockStation, mockMetraStation } from '../../fixtures'

const lineItem: DashboardItem = { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }
const ctaStationItem: DashboardItem = {
  type: 'station',
  id: 'clark-lake',
  addedAt: '2026-04-25T10:00:00Z',
}
const metraStationItem: DashboardItem = {
  type: 'station',
  id: 'aurora',
  addedAt: '2026-04-25T10:00:00Z',
}

const ctaSchedule: StationSchedule = {
  directions: [
    { headsign: 'Loop', line: 'Red', weekday: [], saturday: [], sunday: [] },
    { headsign: "O'Hare", line: 'Blue', weekday: [], saturday: [], sunday: [] },
  ],
}

beforeEach(() => {
  jest.clearAllMocks()
  useDashboardStore.getState().clear()
})

describe('DashboardItemMenu', () => {
  it('renders the base menu items without removed placeholders', () => {
    render(
      <DashboardItemMenu
        item={lineItem}
        lines={[mockLine]}
        stations={[mockStation]}
        onClose={() => {}}
      />,
    )
    expect(screen.getByText('Open details')).toBeInTheDocument()
    expect(screen.getByText('Remove from dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Mute alerts')).toBeNull()
    expect(screen.queryByText('Share')).toBeNull()
  })

  it('renders a header block for train favorites when header is provided', () => {
    const trainItem: DashboardItem = {
      type: 'train',
      id: 'md-w_2222',
      addedAt: '2026-04-25T10:00:00Z',
    }
    render(
      <DashboardItemMenu
        item={trainItem}
        lines={[mockMetraLine]}
        stations={[mockMetraStation]}
        header={{ title: 'Schaumburg to Union Station', subtitle: 'MD-W #2222' }}
        onClose={() => {}}
      />,
    )
    expect(screen.getByText('Schaumburg to Union Station')).toBeInTheDocument()
    expect(screen.getByText('MD-W #2222')).toBeInTheDocument()
  })

  it('does not show View / Show toggle rows for line favorites', () => {
    render(
      <DashboardItemMenu
        item={lineItem}
        lines={[mockLine]}
        stations={[mockStation]}
        onClose={() => {}}
      />,
    )
    expect(screen.queryByText('View')).toBeNull()
    expect(screen.queryByText('Show')).toBeNull()
  })

  it('Open details navigates and closes', () => {
    const onClose = jest.fn()
    render(
      <DashboardItemMenu
        item={lineItem}
        lines={[mockLine]}
        stations={[mockStation]}
        onClose={onClose}
      />,
    )
    fireEvent.click(screen.getByText('Open details'))
    expect(mockPush).toHaveBeenCalledWith('/cta/red')
    expect(onClose).toHaveBeenCalled()
  })

  it('disables Open details when no route can be resolved', () => {
    render(
      <DashboardItemMenu
        item={lineItem}
        lines={undefined}
        stations={undefined}
        onClose={() => {}}
      />,
    )
    expect(screen.getByText('Open details')).toBeDisabled()
  })

  it('Remove from dashboard invokes toggle and closes', () => {
    const onClose = jest.fn()
    render(
      <DashboardItemMenu
        item={lineItem}
        lines={[mockLine]}
        stations={[mockStation]}
        onClose={onClose}
      />,
    )
    fireEvent.click(screen.getByText('Remove from dashboard'))
    expect(mockToggle).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('Escape key closes the menu', () => {
    const onClose = jest.fn()
    render(
      <DashboardItemMenu
        item={lineItem}
        lines={[mockLine]}
        stations={[mockStation]}
        onClose={onClose}
      />,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  describe('station favorites', () => {
    it('renders View toggle that updates density', () => {
      render(
        <DashboardItemMenu
          item={ctaStationItem}
          lines={[mockLine]}
          stations={[mockStation]}
          schedule={ctaSchedule}
          onClose={() => {}}
        />,
      )
      expect(screen.getByText('View')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('menuitemradio', { name: 'Compact' }))
      expect(mockUpdate).toHaveBeenCalledWith({ density: 'compact' })
    })

    it('renders Inbound/Outbound toggles for Metra stations', () => {
      render(
        <DashboardItemMenu
          item={metraStationItem}
          lines={[mockMetraLine]}
          stations={[mockMetraStation]}
          onClose={() => {}}
        />,
      )
      expect(screen.getByRole('menuitemradio', { name: 'Inbound' })).toBeInTheDocument()
      expect(screen.getByRole('menuitemradio', { name: 'Outbound' })).toBeInTheDocument()
      fireEvent.click(screen.getByRole('menuitemradio', { name: 'Inbound' }))
      expect(mockUpdate).toHaveBeenCalledWith({ directionFilter: 'inbound' })
    })

    it('renders one chip per CTA headsign from the schedule', () => {
      render(
        <DashboardItemMenu
          item={ctaStationItem}
          lines={[mockLine]}
          stations={[mockStation]}
          schedule={ctaSchedule}
          onClose={() => {}}
        />,
      )
      expect(screen.getByRole('menuitemradio', { name: 'Loop' })).toBeInTheDocument()
      expect(screen.getByRole('menuitemradio', { name: "O'Hare" })).toBeInTheDocument()
      fireEvent.click(screen.getByRole('menuitemradio', { name: 'Loop' }))
      expect(mockUpdate).toHaveBeenCalledWith({ directionFilter: 'Loop' })
    })

    it('reflects the live store selection, not just the prop snapshot', () => {
      // Prop says expanded (default); the live store says compact. The open
      // menu must follow the store so a fresh tap updates the radio immediately.
      useDashboardStore.getState().hydrate([{ ...ctaStationItem, density: 'compact' }])
      render(
        <DashboardItemMenu
          item={ctaStationItem}
          lines={[mockLine]}
          stations={[mockStation]}
          schedule={ctaSchedule}
          onClose={() => {}}
        />,
      )
      expect(screen.getByRole('menuitemradio', { name: 'Compact' })).toHaveAttribute(
        'aria-checked',
        'true',
      )
    })

    it('marks the active option with aria-checked', () => {
      const compactItem: DashboardItem = { ...ctaStationItem, density: 'compact' }
      render(
        <DashboardItemMenu
          item={compactItem}
          lines={[mockLine]}
          stations={[mockStation]}
          schedule={ctaSchedule}
          onClose={() => {}}
        />,
      )
      expect(screen.getByRole('menuitemradio', { name: 'Compact' })).toHaveAttribute(
        'aria-checked',
        'true',
      )
      expect(screen.getByRole('menuitemradio', { name: 'Expanded' })).toHaveAttribute(
        'aria-checked',
        'false',
      )
    })
  })
})
