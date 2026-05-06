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

  it('hides the navigator header on the dashboard screen', () => {
    render(<HomeScreen />)
    expect(capturedOptions).toHaveLength(1)
    expect(capturedOptions[0]).toEqual({ headerShown: false })
  })
})
