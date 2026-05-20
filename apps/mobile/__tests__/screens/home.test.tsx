import type { ReactElement } from 'react'
import { render } from '@testing-library/react-native'
import HomeScreen from '../../app/(app)/index'

const capturedOptions: Record<string, unknown>[] = []

jest.mock('expo-router', () => {
  const Stack = () => null
  Stack.displayName = 'Stack'
  const StackScreen = (props: { options?: Record<string, unknown> }) => {
    capturedOptions.push(props.options ?? {})
    return null
  }
  StackScreen.displayName = 'StackScreen'
  ;(Stack as unknown as { Screen: typeof StackScreen }).Screen = StackScreen
  return { Stack }
})

jest.mock('../../components/HeaderMenuButton', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return {
    __esModule: true,
    default: () => <Text testID="header-menu-button">menu-button</Text>,
  }
})

jest.mock('../../components/dashboard/Dashboard', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return {
    __esModule: true,
    default: () => <Text testID="dashboard-stub">dashboard</Text>,
  }
})

beforeEach(() => {
  capturedOptions.length = 0
})

describe('HomeScreen', () => {
  it('renders the Dashboard', () => {
    const { getByTestId } = render(<HomeScreen />)
    expect(getByTestId('dashboard-stub')).toBeOnTheScreen()
  })

  it('shows a traditional app header with the site title and menu button', () => {
    render(<HomeScreen />)
    expect(capturedOptions).toHaveLength(1)
    const opts = capturedOptions[0]
    // Shared chrome (transparent bg, hairline, title align) is inherited from
    // the Stack screenOptions; the screen only sets its own title + buttons.
    expect(opts.headerTitle).toBe('Chicago Transit Tracker')
    // iOS uses unstable_headerRightItems (the Liquid Glass opt-out path);
    // Android uses headerRight. Either way, exactly one of these is wired up.
    const hasRight =
      typeof opts.headerRight === 'function' || typeof opts.unstable_headerRightItems === 'function'
    expect(hasRight).toBe(true)
    const hasLeft =
      typeof opts.headerLeft === 'function' || typeof opts.unstable_headerLeftItems === 'function'
    expect(hasLeft).toBe(true)
  })

  it('renders the HeaderMenuButton in the header', () => {
    render(<HomeScreen />)
    const opts = capturedOptions[0]
    const items = (
      opts.unstable_headerRightItems as undefined | (() => { element: ReactElement }[])
    )?.()
    const element = items ? items[0].element : (opts.headerRight as () => ReactElement)()
    const { getByText } = render(element)
    expect(getByText('menu-button')).toBeOnTheScreen()
  })

  it('opts the menu button out of the iOS 26 Liquid Glass background', () => {
    render(<HomeScreen />)
    const opts = capturedOptions[0]
    const items = (
      opts.unstable_headerRightItems as
        | undefined
        | (() => { type: string; hidesSharedBackground?: boolean }[])
    )?.()
    if (items) {
      // iOS: the screen registers a custom item with the glass background hidden.
      expect(items).toHaveLength(1)
      expect(items[0]).toMatchObject({ type: 'custom', hidesSharedBackground: true })
    } else {
      // Android branch: nothing to opt out of, just confirm the legacy slot is wired.
      expect(typeof opts.headerRight).toBe('function')
    }
  })
})
