import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.unmock('@components/DashboardAddButton')

const mockToggle = jest.fn()
const mockUseToggleDashboardItem = jest.fn()
jest.mock('@lib/hooks/useToggleDashboardItem', () => ({
  useToggleDashboardItem: (...args: unknown[]) => mockUseToggleDashboardItem(...args),
}))

const mockUseAuth = jest.fn()
jest.mock('@components/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('@components/AuthModal', () => {
  return function MockAuthModal({ onClose }: { onClose: () => void }) {
    return (
      <div data-testid="auth-modal">
        <button onClick={onClose}>close</button>
      </div>
    )
  }
})

import DashboardAddButton from '@components/DashboardAddButton'
import { useDashboardStore } from '@lib/store/dashboard'

beforeEach(() => {
  jest.clearAllMocks()
  useDashboardStore.setState({ items: [], hydrated: false })
  localStorage.clear()
})

describe('DashboardAddButton', () => {
  it('shows "Add to dashboard" label when not on dashboard', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    mockUseToggleDashboardItem.mockReturnValue({
      isOnDashboard: false,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: false,
    })
    render(<DashboardAddButton type="line" id="red" />)
    const btn = screen.getByRole('button', { name: 'Add to dashboard' })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows "Remove from dashboard" label when already on dashboard', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    mockUseToggleDashboardItem.mockReturnValue({
      isOnDashboard: true,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: false,
    })
    render(<DashboardAddButton type="line" id="red" />)
    const btn = screen.getByRole('button', { name: 'Remove from dashboard' })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls toggle on click when signed in', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    mockUseToggleDashboardItem.mockReturnValue({
      isOnDashboard: false,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: false,
    })
    render(<DashboardAddButton type="station" id="clark-lake" />)
    fireEvent.click(screen.getByRole('button'))
    expect(mockToggle).toHaveBeenCalled()
  })

  it('opens AuthModal instead of toggling when signed out', () => {
    mockUseAuth.mockReturnValue({ user: null })
    mockUseToggleDashboardItem.mockReturnValue({
      isOnDashboard: false,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: true,
    })
    render(<DashboardAddButton type="line" id="red" />)
    fireEvent.click(screen.getByRole('button', { name: 'Add to dashboard' }))
    expect(screen.getByTestId('auth-modal')).toBeInTheDocument()
    expect(mockToggle).not.toHaveBeenCalled()
  })

  it('applies the pending add after sign-in completes', async () => {
    mockUseAuth.mockReturnValue({ user: null })
    mockUseToggleDashboardItem.mockReturnValue({
      isOnDashboard: false,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: true,
    })

    const { rerender } = render(<DashboardAddButton type="line" id="red" />)
    fireEvent.click(screen.getByRole('button', { name: 'Add to dashboard' }))
    expect(screen.getByTestId('auth-modal')).toBeInTheDocument()
    expect(mockToggle).not.toHaveBeenCalled()

    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    mockUseToggleDashboardItem.mockReturnValue({
      isOnDashboard: false,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: false,
    })
    await act(async () => {
      rerender(<DashboardAddButton type="line" id="red" />)
    })

    await waitFor(() => {
      expect(mockToggle).toHaveBeenCalledTimes(1)
    })
  })

  it('does not re-apply if item already added (different device)', async () => {
    mockUseAuth.mockReturnValue({ user: null })
    mockUseToggleDashboardItem.mockReturnValue({
      isOnDashboard: false,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: true,
    })

    const { rerender } = render(<DashboardAddButton type="line" id="red" />)
    fireEvent.click(screen.getByRole('button', { name: 'Add to dashboard' }))

    useDashboardStore.setState({
      items: [{ type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }],
      hydrated: true,
    })
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    mockUseToggleDashboardItem.mockReturnValue({
      isOnDashboard: true,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: false,
    })

    await act(async () => {
      rerender(<DashboardAddButton type="line" id="red" />)
    })

    expect(mockToggle).not.toHaveBeenCalled()
  })

  it('disables the button while a write is in flight', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    mockUseToggleDashboardItem.mockReturnValue({
      isOnDashboard: false,
      toggle: mockToggle,
      isToggling: true,
      needsAuth: false,
    })
    render(<DashboardAddButton type="line" id="red" />)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
