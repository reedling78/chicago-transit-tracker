import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { darkTheme, themes, type Theme, type ThemeMode } from './tokens'
import { useSystemColorScheme } from './useSystemColorScheme'

export type ThemeModeSetting = 'system' | 'light' | 'dark'

const STORAGE_KEY = '@ctt/theme-mode'

export interface ThemeContextValue {
  theme: Theme
  mode: ThemeModeSetting
  resolvedMode: ThemeMode
  setMode: (mode: ThemeModeSetting) => void
}

const defaultContextValue: ThemeContextValue = {
  theme: darkTheme,
  mode: 'system',
  resolvedMode: 'dark',
  setMode: () => {},
}

export const ThemeContext = createContext<ThemeContextValue>(defaultContextValue)

function isStoredMode(value: unknown): value is ThemeModeSetting {
  return value === 'system' || value === 'light' || value === 'dark'
}

function resolveMode(setting: ThemeModeSetting, systemScheme: 'light' | 'dark' | null): ThemeMode {
  if (setting === 'light') return 'light'
  if (setting === 'dark') return 'dark'
  return systemScheme === 'light' ? 'light' : 'dark'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeModeSetting>('system')
  const systemScheme = useSystemColorScheme()

  useEffect(() => {
    let cancelled = false
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return
        if (isStoredMode(stored)) setModeState(stored)
      })
      .catch(() => {
        // AsyncStorage failures are non-fatal; fall back to default 'system'.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const setMode = useCallback((next: ThemeModeSetting) => {
    setModeState(next)
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // Persistence failures shouldn't block the UI swap.
    })
  }, [])

  const value = useMemo<ThemeContextValue>(() => {
    const resolvedMode = resolveMode(mode, systemScheme)
    return { theme: themes[resolvedMode], mode, resolvedMode, setMode }
  }, [mode, systemScheme, setMode])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
