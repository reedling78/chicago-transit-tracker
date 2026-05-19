import { render, fireEvent, waitFor, act } from '@testing-library/react-native'
import { Path } from 'react-native-svg'

import FavoriteButton from '../../components/FavoriteButton'
import { useFavoritesStore } from '../../lib/store/favorites'
import { darkTheme } from '../../lib/theme'

// Override the global FavoriteButton stub from jest.setup.ts; this test
// renders the real component.
jest.unmock('../../components/FavoriteButton')

const mockToggle = jest.fn()
const mockUseToggleFavorite = jest.fn()
jest.mock('../../lib/useToggleFavorite', () => ({
  useToggleFavorite: (...args: unknown[]) => mockUseToggleFavorite(...args),
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
  useFavoritesStore.setState({ favorites: [], hydrated: false })
})

describe('FavoriteButton (mobile)', () => {
  it('renders with the correct label when not favorited', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    mockUseToggleFavorite.mockReturnValue({
      isFavorited: false,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: false,
    })
    const { getByLabelText } = render(<FavoriteButton type="line" id="red" />)
    expect(getByLabelText('Add to favorites')).toBeTruthy()
  })

  it('renders with the correct label when favorited', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    mockUseToggleFavorite.mockReturnValue({
      isFavorited: true,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: false,
    })
    const { getByLabelText } = render(<FavoriteButton type="line" id="red" />)
    expect(getByLabelText('Remove from favorites')).toBeTruthy()
  })

  it('calls toggle on press when signed in', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    mockUseToggleFavorite.mockReturnValue({
      isFavorited: false,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: false,
    })
    const { getByLabelText } = render(<FavoriteButton type="station" id="clark-lake" />)
    fireEvent.press(getByLabelText('Add to favorites'))
    expect(mockToggle).toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('routes to /auth when signed out', () => {
    mockUseAuth.mockReturnValue({ user: null })
    mockUseToggleFavorite.mockReturnValue({
      isFavorited: false,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: true,
    })
    const { getByLabelText } = render(<FavoriteButton type="line" id="red" />)
    fireEvent.press(getByLabelText('Add to favorites'))
    expect(mockPush).toHaveBeenCalledWith('/auth')
    expect(mockToggle).not.toHaveBeenCalled()
  })

  it('renders a flat heart (no scrim circle) with a generous touch area', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    mockUseToggleFavorite.mockReturnValue({
      isFavorited: false,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: false,
    })
    const { getByLabelText, UNSAFE_getAllByType } = render(<FavoriteButton type="line" id="red" />)
    const pressable = getByLabelText('Add to favorites')
    // hitSlop expanded so the heart is reliably hittable in app-bar contexts
    expect(pressable.props.hitSlop).toBe(12)
    // Pressable's style may be a function or already-resolved array depending on
    // the testing library version — handle both.
    const rawStyle = pressable.props.style
    const resolved = typeof rawStyle === 'function' ? rawStyle({ pressed: false }) : rawStyle
    const flattenedStyle = (Array.isArray(resolved) ? resolved.flat() : [resolved]).reduce<
      Record<string, unknown>
    >((acc, s) => ({ ...acc, ...((s as Record<string, unknown>) ?? {}) }), {})
    expect(flattenedStyle.width).toBe(48)
    expect(flattenedStyle.height).toBe(48)
    // The heart is the only child — no circular scrim View wrapping the Svg.
    expect(UNSAFE_getAllByType(Path)).toHaveLength(1)
  })

  it('defaults the heart stroke to the primary text color (visible on the solid bar)', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    mockUseToggleFavorite.mockReturnValue({
      isFavorited: false,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: false,
    })
    const { UNSAFE_getByType } = render(<FavoriteButton type="line" id="red" />)
    expect(UNSAFE_getByType(Path).props.stroke).toBe(darkTheme.colors.text.primary)
  })

  it('respects an explicit stroke color override (line-colored hearts)', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    mockUseToggleFavorite.mockReturnValue({
      isFavorited: false,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: false,
    })
    const { UNSAFE_getByType } = render(<FavoriteButton type="line" id="red" color="#c60c30" />)
    expect(UNSAFE_getByType(Path).props.stroke).toBe('#c60c30')
  })

  it('applies the pending favorite after sign-in completes', async () => {
    mockUseAuth.mockReturnValue({ user: null })
    mockUseToggleFavorite.mockReturnValue({
      isFavorited: false,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: true,
    })

    const { getByLabelText, rerender } = render(<FavoriteButton type="line" id="red" />)
    fireEvent.press(getByLabelText('Add to favorites'))
    expect(mockPush).toHaveBeenCalledWith('/auth')
    expect(mockToggle).not.toHaveBeenCalled()

    mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    mockUseToggleFavorite.mockReturnValue({
      isFavorited: false,
      toggle: mockToggle,
      isToggling: false,
      needsAuth: false,
    })
    await act(async () => {
      rerender(<FavoriteButton type="line" id="red" />)
    })

    await waitFor(() => {
      expect(mockToggle).toHaveBeenCalledTimes(1)
    })
  })
})
