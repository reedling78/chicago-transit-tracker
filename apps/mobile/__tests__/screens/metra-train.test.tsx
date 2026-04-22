import { render, screen } from '@testing-library/react-native'
import { mockMetraLine } from '../fixtures'
import { useLine } from '../../lib/hooks'
import MetraTrainDetailScreen from '../../app/(tabs)/metra/[line]/train/[trainNumber]'

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ line: 'bnsf', trainNumber: '1200' }),
}))

jest.mock('expo-linear-gradient', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native')
  return {
    LinearGradient: (props: Record<string, unknown>) => <View {...props} />,
  }
})

jest.mock('../../lib/hooks', () => ({
  useLine: jest.fn(),
}))

const mockUseLine = useLine as jest.MockedFunction<typeof useLine>

describe('MetraTrainDetailScreen', () => {
  it('renders the train number as the title', () => {
    mockUseLine.mockReturnValue({ line: mockMetraLine, loading: false })
    render(<MetraTrainDetailScreen />)
    expect(screen.getByText('Train 1200')).toBeOnTheScreen()
  })

  it('renders the line name as the description', () => {
    mockUseLine.mockReturnValue({ line: mockMetraLine, loading: false })
    render(<MetraTrainDetailScreen />)
    expect(screen.getByText('BNSF Railway Line')).toBeOnTheScreen()
  })

  it('renders the line short-name chip', () => {
    mockUseLine.mockReturnValue({ line: mockMetraLine, loading: false })
    render(<MetraTrainDetailScreen />)
    expect(screen.getByTestId('train-line-chip')).toBeOnTheScreen()
    expect(screen.getByText('BNSF')).toBeOnTheScreen()
  })

  it('renders only the train number when the line has not loaded yet', () => {
    mockUseLine.mockReturnValue({ line: null, loading: true })
    render(<MetraTrainDetailScreen />)
    expect(screen.getByText('Train 1200')).toBeOnTheScreen()
    expect(screen.queryByTestId('train-line-chip')).toBeNull()
  })
})
