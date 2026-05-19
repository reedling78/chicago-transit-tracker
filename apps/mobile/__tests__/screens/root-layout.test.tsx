import type { ReactNode } from 'react'
import { render } from '@testing-library/react-native'
import RootLayout from '../../app/_layout'

jest.mock('expo-router/drawer', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native')
  const Drawer = ({ drawerContent }: { drawerContent: () => React.ReactNode }) => (
    <View testID="drawer">{drawerContent({ navigation: { closeDrawer: jest.fn() } })}</View>
  )
  Drawer.Screen = () => null
  return { Drawer }
})
jest.mock(
  '../../components/menu/MenuDrawerContent',
  () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native')
    return { __esModule: true, default: () => <Text>menu-drawer-content</Text> }
  },
  // MenuDrawerContent is created in a later task; virtual-mock it so this
  // suite can verify the Drawer wiring before the real module lands.
  { virtual: true },
)

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
})
