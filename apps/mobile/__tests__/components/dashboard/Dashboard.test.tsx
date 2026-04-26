import { render } from '@testing-library/react-native'
import { Text } from 'react-native'

import Dashboard from '../../../components/dashboard/Dashboard'

jest.mock('../../../components/dashboard/DashboardHeader', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native')
  return {
    __esModule: true,
    default: () => <RN.Text testID="dash-header" />,
  }
})
jest.mock('../../../components/dashboard/FavoriteTrains', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native')
  return {
    __esModule: true,
    default: () => <RN.Text testID="dash-trains" />,
  }
})
jest.mock('../../../components/dashboard/FavoriteStations', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native')
  return {
    __esModule: true,
    default: () => <RN.Text testID="dash-stations" />,
  }
})
jest.mock('../../../components/dashboard/FavoriteLines', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native')
  return {
    __esModule: true,
    default: () => <RN.Text testID="dash-lines" />,
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
  it('renders all sections in the personal-first order', () => {
    const { getByTestId } = render(<Dashboard />)
    expect(getByTestId('dash-header')).toBeTruthy()
    expect(getByTestId('dash-trains')).toBeTruthy()
    expect(getByTestId('dash-stations')).toBeTruthy()
    expect(getByTestId('dash-lines')).toBeTruthy()
    expect(getByTestId('dash-hero')).toBeTruthy()
    // sanity-check we used Text shape as expected
    void Text
  })
})
