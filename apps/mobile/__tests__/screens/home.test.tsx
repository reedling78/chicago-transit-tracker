import { render } from '@testing-library/react-native'
import HomeScreen from '../../app/index'

jest.mock('../../components/dashboard/Dashboard', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return {
    __esModule: true,
    default: () => <Text testID="dashboard-stub">dashboard</Text>,
  }
})

describe('HomeScreen', () => {
  it('renders the Dashboard component', () => {
    const { getByTestId } = render(<HomeScreen />)
    expect(getByTestId('dashboard-stub')).toBeOnTheScreen()
  })
})
