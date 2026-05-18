import { render } from '@testing-library/react-native'
import HomeScreen from '../../app/index'

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

jest.mock('../../components/HeaderUserIcon', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return {
    __esModule: true,
    default: () => <Text testID="header-user-icon">profile</Text>,
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

  it('shows a traditional app header with the site title and profile button', () => {
    render(<HomeScreen />)
    expect(capturedOptions).toHaveLength(1)
    const opts = capturedOptions[0]
    expect(opts.headerShown).toBe(true)
    expect(opts.headerTransparent).toBe(true)
    expect(opts.headerTitle).toBe('Chicago Transit Tracker')
    expect(opts.headerTitleAlign).toBe('left')
    expect(typeof opts.headerRight).toBe('function')
    expect(typeof opts.headerLeft).toBe('function')
  })
})
