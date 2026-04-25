import { render } from '@testing-library/react-native'

import MyTrainsScreen from '../../app/(tabs)/my-trains'

jest.mock('../../components/dashboard/Dashboard', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native')
  return {
    __esModule: true,
    default: () => <RN.Text testID="dashboard-stub">dashboard</RN.Text>,
  }
})

describe('MyTrainsScreen', () => {
  it('renders the Dashboard component', () => {
    const { getByTestId } = render(<MyTrainsScreen />)
    expect(getByTestId('dashboard-stub')).toBeTruthy()
  })
})
