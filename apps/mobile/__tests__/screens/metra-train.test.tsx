import { render, screen } from '@testing-library/react-native'
import MetraTrainDetailScreen from '../../app/(tabs)/metra/[line]/train/[trainNumber]'

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ line: 'bnsf', trainNumber: '1200' }),
}))

describe('MetraTrainDetailScreen', () => {
  it('renders the train number from the route params', () => {
    render(<MetraTrainDetailScreen />)
    expect(screen.getByText('Train 1200')).toBeOnTheScreen()
  })

  it('renders the upper-cased line slug as the subtitle', () => {
    render(<MetraTrainDetailScreen />)
    expect(screen.getByText('BNSF line')).toBeOnTheScreen()
  })

  it('renders a placeholder body while the feature is being built', () => {
    render(<MetraTrainDetailScreen />)
    expect(screen.getByText('Train detail coming soon.')).toBeOnTheScreen()
  })
})
