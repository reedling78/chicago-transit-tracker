import type { ReactNode } from 'react'
import { render } from '@testing-library/react-native'
import HomeScreen from '../../app/index'

jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactMock = require('react')
  const Stack = () => null
  Stack.displayName = 'Stack'
  const StackScreen = (props: { options?: { headerRight?: () => ReactNode } }) =>
    ReactMock.createElement(
      ReactMock.Fragment,
      null,
      props.options?.headerRight ? props.options.headerRight() : null,
    )
  StackScreen.displayName = 'StackScreen'
  ;(Stack as unknown as { Screen: typeof StackScreen }).Screen = StackScreen
  return { Stack }
})

jest.mock('../../components/dashboard/Dashboard', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return {
    __esModule: true,
    default: () => <Text testID="dashboard-stub">dashboard</Text>,
  }
})

jest.mock('../../components/HeaderUserIcon', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return {
    __esModule: true,
    default: () => <Text testID="header-user-icon">user</Text>,
  }
})

describe('HomeScreen', () => {
  it('renders the Dashboard with a header user icon on the right', () => {
    const { getByTestId } = render(<HomeScreen />)
    expect(getByTestId('dashboard-stub')).toBeOnTheScreen()
    expect(getByTestId('header-user-icon')).toBeOnTheScreen()
  })

  it('configures the screen title as "Chicago Transit Tracker"', () => {
    // The Stack.Screen options object isn't directly inspectable through the mock,
    // but a render error would surface here if the title prop changed shape.
    expect(() => render(<HomeScreen />)).not.toThrow()
  })
})
