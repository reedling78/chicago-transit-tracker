import { createRef } from 'react'
import { Alert } from 'react-native'
import { render, fireEvent, act } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Favorite } from '@ctt/shared'
import FavoriteMenuSheet, {
  type FavoriteMenuSheetHandle,
} from '../../../components/dashboard/FavoriteMenuSheet'
import { mockLine, mockStation } from '../../fixtures'
import { useFavoritesStore } from '../../../lib/store/favorites'

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockToggle = jest.fn()
jest.mock('../../../lib/useToggleFavorite', () => ({
  useToggleFavorite: () => ({
    isFavorited: true,
    toggle: mockToggle,
    isToggling: false,
    needsAuth: false,
  }),
}))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  jest.clearAllMocks()
  useFavoritesStore.setState({ favorites: [], hydrated: false, pendingWrites: 0 })
})

describe('FavoriteMenuSheet', () => {
  it('does not render menu items until open() is called', () => {
    const ref = createRef<FavoriteMenuSheetHandle>()
    const { queryByText } = render(
      <FavoriteMenuSheet ref={ref} lines={[mockLine]} stations={[mockStation]} />,
      { wrapper },
    )
    expect(queryByText('Open details')).toBeNull()
    expect(queryByText('Remove from favorites')).toBeNull()
  })

  it('shows menu items + line title after open()', () => {
    const ref = createRef<FavoriteMenuSheetHandle>()
    const { getByText } = render(
      <FavoriteMenuSheet ref={ref} lines={[mockLine]} stations={[mockStation]} />,
      { wrapper },
    )
    const fav: Favorite = { type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }
    act(() => ref.current?.open(fav))
    expect(getByText('Red Line')).toBeTruthy()
    expect(getByText('Open details')).toBeTruthy()
    expect(getByText('Mute alerts')).toBeTruthy()
    expect(getByText('Share')).toBeTruthy()
    expect(getByText('Remove from favorites')).toBeTruthy()
  })

  it('Open details navigates to the favorite route', () => {
    const ref = createRef<FavoriteMenuSheetHandle>()
    const { getByText } = render(
      <FavoriteMenuSheet ref={ref} lines={[mockLine]} stations={[mockStation]} />,
      { wrapper },
    )
    act(() => ref.current?.open({ type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }))
    fireEvent.press(getByText('Open details'))
    expect(mockPush).toHaveBeenCalledWith('/cta/red')
  })

  it('Mute alerts triggers a placeholder alert', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation()
    const ref = createRef<FavoriteMenuSheetHandle>()
    const { getByText } = render(
      <FavoriteMenuSheet ref={ref} lines={[mockLine]} stations={[mockStation]} />,
      { wrapper },
    )
    act(() => ref.current?.open({ type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }))
    fireEvent.press(getByText('Mute alerts'))
    expect(alertSpy).toHaveBeenCalledWith('Coming soon', expect.stringContaining('alert'))
    alertSpy.mockRestore()
  })

  it('Share triggers a placeholder alert', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation()
    const ref = createRef<FavoriteMenuSheetHandle>()
    const { getByText } = render(
      <FavoriteMenuSheet ref={ref} lines={[mockLine]} stations={[mockStation]} />,
      { wrapper },
    )
    act(() => ref.current?.open({ type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }))
    fireEvent.press(getByText('Share'))
    expect(alertSpy).toHaveBeenCalledWith('Coming soon', expect.stringContaining('Sharing'))
    alertSpy.mockRestore()
  })

  it('Remove from favorites invokes toggle()', () => {
    const ref = createRef<FavoriteMenuSheetHandle>()
    const { getByText } = render(
      <FavoriteMenuSheet ref={ref} lines={[mockLine]} stations={[mockStation]} />,
      { wrapper },
    )
    act(() => ref.current?.open({ type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }))
    fireEvent.press(getByText('Remove from favorites'))
    expect(mockToggle).toHaveBeenCalled()
  })

  it('falls back to favorite id when line/station data is missing', () => {
    const ref = createRef<FavoriteMenuSheetHandle>()
    const { getByText } = render(
      <FavoriteMenuSheet ref={ref} lines={undefined} stations={undefined} />,
      { wrapper },
    )
    act(() => ref.current?.open({ type: 'line', id: 'red', addedAt: '2026-04-25T10:00:00Z' }))
    expect(getByText('red')).toBeTruthy()
  })
})
