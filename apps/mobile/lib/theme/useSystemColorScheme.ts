import { useColorScheme } from 'react-native'

export function useSystemColorScheme(): 'light' | 'dark' | null {
  const scheme = useColorScheme()
  return scheme === 'light' || scheme === 'dark' ? scheme : null
}
