export type ThemeMode = 'light' | 'dark'

export interface ThemeColors {
  bg: {
    canvas: string
    surface: string
    elevated: string
    scrim: string
    /** Navigator header fill — canvas color at reduced alpha so content shows faintly behind. */
    headerTranslucent: string
  }
  text: {
    primary: string
    secondary: string
    muted: string
    inverse: string
    /** Text rendered over a photo + scrim overlay; always near-white regardless of mode. */
    onScrim: string
    /** Faded variant of onScrim, for descriptions / metadata over photos. */
    onScrimMuted: string
  }
  border: {
    subtle: string
    strong: string
    /** Theme-aware 1px divider that reads in both light and dark. */
    hairline: string
  }
  accent: {
    primary: string
    primaryFg: string
  }
  status: {
    onTime: string
    delayed: string
    scheduled: string
    neutral: string
  }
}

export interface ThemeRadius {
  sm: number
  md: number
  lg: number
  xl: number
  full: number
}

export interface ThemeSpace {
  1: number
  2: number
  3: number
  4: number
  5: number
  6: number
  8: number
  10: number
}

export interface Theme {
  mode: ThemeMode
  colors: ThemeColors
  radius: ThemeRadius
  space: ThemeSpace
}

const radius: ThemeRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
}

const space: ThemeSpace = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
}

const status = {
  onTime: '#22c55e',
  delayed: '#ef4444',
  scheduled: '#3b82f6',
  neutral: '#9ca3af',
}

export const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    bg: {
      canvas: '#0f0f1e',
      surface: '#1f2937',
      elevated: '#111827',
      scrim: 'rgba(0,0,0,0.45)',
      headerTranslucent: 'rgba(15,15,30,0.88)',
    },
    text: {
      primary: '#ffffff',
      secondary: '#9ca3af',
      muted: '#6b7280',
      inverse: '#111827',
      onScrim: '#ffffff',
      onScrimMuted: 'rgba(255,255,255,0.85)',
    },
    border: {
      subtle: '#374151',
      strong: '#4b5563',
      hairline: 'rgba(255,255,255,0.12)',
    },
    accent: {
      primary: '#3b82f6',
      primaryFg: '#ffffff',
    },
    status,
  },
  radius,
  space,
}

export const lightTheme: Theme = {
  mode: 'light',
  colors: {
    bg: {
      canvas: '#f9fafb',
      surface: '#ffffff',
      elevated: '#ffffff',
      scrim: 'rgba(0,0,0,0.45)',
      headerTranslucent: 'rgba(249,250,251,0.88)',
    },
    text: {
      primary: '#111827',
      secondary: '#4b5563',
      muted: '#9ca3af',
      inverse: '#ffffff',
      onScrim: '#ffffff',
      onScrimMuted: 'rgba(255,255,255,0.85)',
    },
    border: {
      subtle: '#e5e7eb',
      strong: '#d1d5db',
      hairline: 'rgba(0,0,0,0.12)',
    },
    accent: {
      primary: '#2563eb',
      primaryFg: '#ffffff',
    },
    status,
  },
  radius,
  space,
}

export const themes: Record<ThemeMode, Theme> = {
  light: lightTheme,
  dark: darkTheme,
}
