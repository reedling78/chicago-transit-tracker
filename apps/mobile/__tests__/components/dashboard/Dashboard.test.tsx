import { render } from '@testing-library/react-native'

import Dashboard from '../../../components/dashboard/Dashboard'

jest.mock('../../../lib/useNavHeaderInset', () => ({
  useNavHeaderInset: () => 64,
}))

jest.mock('../../../components/dashboard/DashboardHeader', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native')
  return {
    __esModule: true,
    default: () => <RN.Text testID="dash-header" />,
  }
})
jest.mock('../../../components/dashboard/DashboardGrid', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native')
  return {
    __esModule: true,
    default: () => <RN.Text testID="dash-grid" />,
  }
})
jest.mock('../../../components/dashboard/DashboardHero', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native')
  return {
    __esModule: true,
    default: () => <RN.Text testID="dash-hero" />,
  }
})

describe('Dashboard (mobile)', () => {
  it('renders the header, grid, and marketing hero', () => {
    const { getByTestId } = render(<Dashboard />)
    expect(getByTestId('dash-header')).toBeTruthy()
    expect(getByTestId('dash-grid')).toBeTruthy()
    expect(getByTestId('dash-hero')).toBeTruthy()
  })
})
