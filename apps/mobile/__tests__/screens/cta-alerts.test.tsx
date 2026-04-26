import { render } from '@testing-library/react-native'
import CtaAlertsScreen from '../../app/cta/alerts'

jest.mock('../../lib/useNavHeaderInset', () => ({
  useNavHeaderInset: () => 64,
}))

jest.mock('../../components/CTAAlerts', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return {
    __esModule: true,
    default: () => <Text testID="cta-alerts-stub">cta alerts</Text>,
  }
})

describe('CtaAlertsScreen', () => {
  it('renders the CTAAlerts list inside a scroll container', () => {
    const { getByTestId } = render(<CtaAlertsScreen />)
    expect(getByTestId('cta-alerts-stub')).toBeOnTheScreen()
  })
})
