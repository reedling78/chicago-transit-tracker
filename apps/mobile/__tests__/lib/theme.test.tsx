import { Text } from 'react-native'
import { act, render, waitFor } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ThemeProvider, useTheme } from '../../lib/theme'

let mockColorScheme: 'light' | 'dark' | null = null

jest.mock('../../lib/theme/useSystemColorScheme', () => ({
  useSystemColorScheme: () => mockColorScheme,
}))

const STORAGE_KEY = '@ctt/theme-mode'

function ThemeProbe({ onResolve }: { onResolve: (v: ReturnType<typeof useTheme>) => void }) {
  const value = useTheme()
  onResolve(value)
  return <Text testID="probe">{value.resolvedMode}</Text>
}

describe('ThemeProvider', () => {
  beforeEach(async () => {
    mockColorScheme = null
    await AsyncStorage.clear()
    ;(global as { __DEV__?: boolean }).__DEV__ = true
  })

  it('defaults to system mode and resolves to dark when system scheme is null', async () => {
    let captured: ReturnType<typeof useTheme> | null = null
    render(
      <ThemeProvider>
        <ThemeProbe onResolve={(v) => (captured = v)} />
      </ThemeProvider>,
    )
    await waitFor(() => expect(captured).not.toBeNull())
    expect(captured!.mode).toBe('system')
    expect(captured!.resolvedMode).toBe('dark')
    expect(captured!.theme.mode).toBe('dark')
  })

  it('follows the system color scheme when mode is system in dev', async () => {
    mockColorScheme = 'light'
    let captured: ReturnType<typeof useTheme> | null = null
    render(
      <ThemeProvider>
        <ThemeProbe onResolve={(v) => (captured = v)} />
      </ThemeProvider>,
    )
    await waitFor(() => expect(captured?.resolvedMode).toBe('light'))
    expect(captured!.theme.colors.bg.canvas).toBe('#f9fafb')
  })

  it('honors explicit mode overrides in dev', async () => {
    mockColorScheme = 'light'
    let captured: ReturnType<typeof useTheme> | null = null
    render(
      <ThemeProvider>
        <ThemeProbe onResolve={(v) => (captured = v)} />
      </ThemeProvider>,
    )
    await waitFor(() => expect(captured).not.toBeNull())

    await act(async () => {
      captured!.setMode('dark')
    })

    await waitFor(() => expect(captured?.mode).toBe('dark'))
    expect(captured!.resolvedMode).toBe('dark')
    expect(captured!.theme.colors.bg.surface).toBe('#1f2937')
  })

  it('persists the mode to AsyncStorage when setMode is called', async () => {
    let captured: ReturnType<typeof useTheme> | null = null
    render(
      <ThemeProvider>
        <ThemeProbe onResolve={(v) => (captured = v)} />
      </ThemeProvider>,
    )
    await waitFor(() => expect(captured).not.toBeNull())

    await act(async () => {
      captured!.setMode('light')
    })

    await waitFor(async () => {
      expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe('light')
    })
  })

  it('hydrates the stored mode on mount', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'light')
    let captured: ReturnType<typeof useTheme> | null = null
    render(
      <ThemeProvider>
        <ThemeProbe onResolve={(v) => (captured = v)} />
      </ThemeProvider>,
    )
    await waitFor(() => expect(captured?.mode).toBe('light'))
    expect(captured!.resolvedMode).toBe('light')
  })

  it('ignores corrupted stored values', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'unexpected-value')
    let captured: ReturnType<typeof useTheme> | null = null
    render(
      <ThemeProvider>
        <ThemeProbe onResolve={(v) => (captured = v)} />
      </ThemeProvider>,
    )
    await waitFor(() => expect(captured).not.toBeNull())
    expect(captured!.mode).toBe('system')
  })

  it('honors the user-chosen mode in production builds (no DEV gate)', async () => {
    ;(global as { __DEV__?: boolean }).__DEV__ = false
    mockColorScheme = 'dark'
    let captured: ReturnType<typeof useTheme> | null = null
    render(
      <ThemeProvider>
        <ThemeProbe onResolve={(v) => (captured = v)} />
      </ThemeProvider>,
    )
    await waitFor(() => expect(captured).not.toBeNull())

    await act(async () => {
      captured!.setMode('light')
    })

    await waitFor(() => expect(captured?.mode).toBe('light'))
    expect(captured!.resolvedMode).toBe('light')
    expect(captured!.theme.colors.bg.canvas).toBe('#f9fafb')
  })
})
