import type { ReactNode } from 'react'
import { render } from '@testing-library/react-native'
import AppStackLayout from '../../app/(app)/_layout'

jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native')
  const Stack = (props: { children?: unknown; screenOptions?: Record<string, unknown> }) => (
    <View testID="stack" data-options={JSON.stringify(props.screenOptions ?? {})}>
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

jest.mock('../../components/HeaderBackButton', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return {
    __esModule: true,
    default: () => <Text>HeaderBackButton</Text>,
  }
})

describe('AppStackLayout (app group)', () => {
  it('renders the Stack with transparent header options and the back-button slot', () => {
    const { getByTestId, getByText } = render(<AppStackLayout />)
    const stack = getByTestId('stack')
    const options = JSON.parse(stack.props['data-options']) as {
      headerTransparent: boolean
      headerShadowVisible: boolean
      headerBackVisible: boolean
      headerStyle: { backgroundColor: string }
      headerTitleAlign: string
      title: string
    }
    expect(options.headerTransparent).toBe(true)
    expect(options.headerShadowVisible).toBe(false)
    expect(options.headerBackVisible).toBe(false)
    expect(options.headerStyle.backgroundColor).toBe('transparent')
    expect(options.headerTitleAlign).toBe('left')
    expect(options.title).toBe('')
    expect(getByText('HeaderBackButton')).toBeOnTheScreen()
  })

  it('registers the auth screen as a header-less modal', () => {
    const { getByTestId } = render(<AppStackLayout />)
    const screen = getByTestId('stack-screen-auth')
    const options = JSON.parse(screen.props['data-options']) as {
      presentation?: string
      headerShown?: boolean
    }
    expect(options.presentation).toBe('modal')
    expect(options.headerShown).toBe(false)
  })

  it('renders the status bar', () => {
    const { getByTestId } = render(<AppStackLayout />)
    expect(getByTestId('status-bar')).toBeOnTheScreen()
  })
})
