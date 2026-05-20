import { render, fireEvent, waitFor, act } from '@testing-library/react-native'

import DashboardAddButton from '../../components/DashboardAddButton'
import { useDashboardStore } from '../../lib/store/dashboard'

jest.unmock('../../components/DashboardAddButton')

const mockToggle = jest.fn()
const mockUseToggleDashboardItem = jest.fn()
jest.mock('../../lib/useToggleDashboardItem', () => ({
  useToggleDashboardItem: (...args: unknown[]) => mockUseToggleDashboardItem(...args),
}))

const mockUseAuth = jest.fn()
jest.mock('../../lib/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>()
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k: string) => store.get(k) ?? null),
      setItem: jest.fn(async (k: string, v: string) => {
        store.set(k, v)
      }),
      removeItem: jest.fn(async (k: string) => {
        store.delete(k)
      }),
      clear: jest.fn(async () => store.clear()),
      getAllKeys: jest.fn(async () => Array.from(store.keys())),
    },
  }
})

beforeEach(() => {
  jest.clearAllMocks()
  useDashboardStore.setState({ items: [], hydrated: false })
})

describe('DashboardAddButton (mobile)', () => {
  it('shows "Add to dashboard" label when not on dashboard', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    mockUseToggleDashboardItem.mockReturnValue({
      isOnDashboard: false,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: false,
    })
    const { getByLabelText } = render(<DashboardAddButton type="line" id="red" />)
    expect(getByLabelText('Add to dashboard')).toBeTruthy()
  })

  it('shows "Remove from dashboard" label when already added', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    mockUseToggleDashboardItem.mockReturnValue({
      isOnDashboard: true,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: false,
    })
    const { getByLabelText } = render(<DashboardAddButton type="line" id="red" />)
    expect(getByLabelText('Remove from dashboard')).toBeTruthy()
  })

  it('calls toggle on press when signed in', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    mockUseToggleDashboardItem.mockReturnValue({
      isOnDashboard: false,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: false,
    })
    const { getByLabelText } = render(<DashboardAddButton type="station" id="clark-lake" />)
    fireEvent.press(getByLabelText('Add to dashboard'))
    expect(mockToggle).toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('routes to /auth when signed out', () => {
    mockUseAuth.mockReturnValue({ user: null })
    mockUseToggleDashboardItem.mockReturnValue({
      isOnDashboard: false,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: true,
    })
    const { getByLabelText } = render(<DashboardAddButton type="line" id="red" />)
    fireEvent.press(getByLabelText('Add to dashboard'))
    expect(mockPush).toHaveBeenCalledWith('/auth')
    expect(mockToggle).not.toHaveBeenCalled()
  })

  it('renders as a compact, low-opacity pill on top of hero photos', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    mockUseToggleDashboardItem.mockReturnValue({
      isOnDashboard: false,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: false,
    })
    const { getByLabelText } = render(<DashboardAddButton type="line" id="red" />)
    const pressable = getByLabelText('Add to dashboard')
    const raw = pressable.props.style
    const resolved = typeof raw === 'function' ? raw({ pressed: false }) : raw
    const flat = (Array.isArray(resolved) ? resolved.flat() : [resolved]).reduce<
      Record<string, unknown>
    >((acc, s) => ({ ...acc, ...((s as Record<string, unknown>) ?? {}) }), {})
    // Compact pill: halved padding so the hero photo stays visible.
    expect(flat.paddingHorizontal).toBe(8)
    expect(flat.paddingVertical).toBe(4)
    // Background is a low-opacity scrim — the hero photo must still read through.
    const bg = String(flat.backgroundColor)
    const alphaMatch = bg.match(/rgba\([^)]*,\s*([\d.]+)\)/)
    expect(alphaMatch).not.toBeNull()
    expect(Number(alphaMatch![1])).toBeLessThan(0.25)
  })

  it('applies the pending add after sign-in completes', async () => {
    mockUseAuth.mockReturnValue({ user: null })
    mockUseToggleDashboardItem.mockReturnValue({
      isOnDashboard: false,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: true,
    })

    const { getByLabelText, rerender } = render(<DashboardAddButton type="line" id="red" />)
    fireEvent.press(getByLabelText('Add to dashboard'))
    expect(mockPush).toHaveBeenCalledWith('/auth')
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
})
