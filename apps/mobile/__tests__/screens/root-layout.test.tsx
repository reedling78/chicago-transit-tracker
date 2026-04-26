import type { ReactNode } from 'react'
import { render } from '@testing-library/react-native'
import RootLayout from '../../app/_layout'

jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native')
  const Stack = (props: { children?: unknown; screenOptions?: Record<string, unknown> }) => (
    <View testID="stack" data-options={JSON.stringify(props.screenOptions ?? {})}>
      {/* render header slots so we can assert they are wired up */}
      {(props.screenOptions?.headerLeft as undefined | (() => ReactNode))?.()}
      {(props.screenOptions?.headerRight as undefined | (() => ReactNode))?.()}
      {(props.screenOptions?.headerTitle as undefined | (() => ReactNode))?.() ?? null}
      {props.children as ReactNode}
    </View>
  )
  const StackScreen = (props: { name: string; options?: Record<string, unknown> }) => (
    <View
      testID={`stack-screen-${props.name}`}
      data-options={JSON.stringify(props.options ?? {})}
    />
  )
  StackScreen.displayName = 'StackScreen'
  Stack.displayName = 'Stack'
  Stack.Screen = StackScreen
  return { Stack }
})

jest.mock('expo-status-bar', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native')
  return { StatusBar: () => <View testID="status-bar" /> }
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

jest.mock('../../components/HeaderBackButton', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return {
    __esModule: true,
    default: () => <Text>HeaderBackButton</Text>,
  }
})

describe('RootLayout', () => {
  it('renders the root Stack with transparent header options and the back-button slot', () => {
    const { getByTestId, getByText, queryByText } = render(<RootLayout />)
    const stack = getByTestId('stack')
    const options = JSON.parse(stack.props['data-options']) as {
      headerTransparent: boolean
      headerShadowVisible: boolean
      headerBackVisible: boolean
      headerStyle: { backgroundColor: string }
      title: string
    }
    expect(options.headerTransparent).toBe(true)
    expect(options.headerShadowVisible).toBe(false)
    expect(options.headerBackVisible).toBe(false)
    expect(options.headerStyle.backgroundColor).toBe('transparent')
    expect(options.title).toBe('')

    // Back button is wired up; the auth/user header slot has been removed
    expect(getByText('HeaderBackButton')).toBeOnTheScreen()
    expect(queryByText('HeaderUserIcon')).toBeNull()
  })

  it('registers the auth screen as a modal', () => {
    const { getByTestId } = render(<RootLayout />)
    const screen = getByTestId('stack-screen-auth')
    const options = JSON.parse(screen.props['data-options']) as { presentation?: string }
    expect(options.presentation).toBe('modal')
  })
})
