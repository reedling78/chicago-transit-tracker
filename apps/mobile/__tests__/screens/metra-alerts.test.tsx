import { render } from '@testing-library/react-native'
import MetraAlertsScreen from '../../app/(app)/metra/alerts'

jest.mock('../../lib/useNavHeaderInset', () => ({
  useNavHeaderInset: () => 64,
}))

jest.mock('../../components/MetraAlerts', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return {
    __esModule: true,
    default: () => <Text testID="metra-alerts-stub">metra alerts</Text>,
  }
})

describe('MetraAlertsScreen', () => {
  it('renders the MetraAlerts list inside a scroll container', () => {
    const { getByTestId } = render(<MetraAlertsScreen />)
    expect(getByTestId('metra-alerts-stub')).toBeOnTheScreen()
  })

  it('does not render the Footer', () => {
    const { queryByTestId } = render(<MetraAlertsScreen />)
    expect(queryByTestId('footer')).toBeNull()
  })
})
