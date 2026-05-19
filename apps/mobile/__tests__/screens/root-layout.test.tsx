import type { ReactNode } from 'react'
import { render } from '@testing-library/react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import RootLayout from '../../app/_layout'
import { ThemeProvider } from '../../lib/theme'

jest.mock('expo-router/drawer', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native')
  const Drawer = ({
    drawerContent,
  }: {
    drawerContent: (props: { navigation: { closeDrawer: () => void } }) => ReactNode
  }) => <View testID="drawer">{drawerContent({ navigation: { closeDrawer: jest.fn() } })}</View>
  Drawer.displayName = 'Drawer'
  const DrawerScreen = () => null
  DrawerScreen.displayName = 'DrawerScreen'
  Drawer.Screen = DrawerScreen
  return { Drawer }
})
jest.mock('../../components/menu/MenuDrawerContent', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return { __esModule: true, default: () => <Text>menu-drawer-content</Text> }
})

jest.mock('react-native-safe-area-context', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactMock = require('react')
  return {
    SafeAreaProvider: ({ children }: { children: ReactNode }) =>
      ReactMock.createElement(ReactMock.Fragment, null, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  }
})

jest.mock('../../lib/AuthContext', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactMock = require('react')
  return {
    AuthProvider: ({ children }: { children: ReactNode }) =>
      ReactMock.createElement(ReactMock.Fragment, null, children),
    useAuth: () => ({ user: null, profile: null, loading: false }),
  }
})

jest.mock('../../components/QueryProvider', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactMock = require('react')
  return {
    __esModule: true,
    default: ({ children }: { children: ReactNode }) =>
      ReactMock.createElement(ReactMock.Fragment, null, children),
  }
})

describe('RootLayout (mobile)', () => {
  it('renders a Drawer wrapping the app with MenuDrawerContent', () => {
    const { getByText } = render(<RootLayout />)
    expect(getByText('menu-drawer-content')).toBeTruthy()
  })

  it('wraps the Drawer in GestureHandlerRootView, ThemeProvider, and BottomSheetModalProvider', () => {
    // The Drawer needs gesture-handler + reanimated at runtime, the
    // bottom-sheet provider backs FavoriteMenuSheet, and ThemeProvider
    // supplies the context every component reads via useTheme(). These
    // UNSAFE_getByType lookups throw if the corresponding wrapper is
    // removed from app/_layout.tsx — a real regression guard.
    const { UNSAFE_getByType } = render(<RootLayout />)
    expect(UNSAFE_getByType(GestureHandlerRootView)).toBeTruthy()
    expect(UNSAFE_getByType(ThemeProvider)).toBeTruthy()
    expect(UNSAFE_getByType(BottomSheetModalProvider)).toBeTruthy()
  })
})
