import { render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { useNavHeaderInset } from '../../lib/useNavHeaderInset'

const mockUseHeaderHeight = jest.fn()
const mockUseSafeAreaInsets = jest.fn()

jest.mock('@react-navigation/elements', () => ({
  useHeaderHeight: () => mockUseHeaderHeight(),
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockUseSafeAreaInsets(),
}))

function Probe() {
  const inset = useNavHeaderInset()
  return <Text testID="inset">{String(inset)}</Text>
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('useNavHeaderInset', () => {
  it('returns the navigator header height when it is larger than the safe-area fallback', () => {
    mockUseHeaderHeight.mockReturnValue(96)
    mockUseSafeAreaInsets.mockReturnValue({ top: 24, right: 0, bottom: 0, left: 0 })
    const { getByTestId } = render(<Probe />)
    // 24 + 44 = 68; max(96, 68) = 96
    expect(getByTestId('inset').props.children).toBe('96')
  })

  it('falls back to safe-area top + nav bar height when header height is 0 (Android transparent header)', () => {
    mockUseHeaderHeight.mockReturnValue(0)
    mockUseSafeAreaInsets.mockReturnValue({ top: 24, right: 0, bottom: 0, left: 0 })
    const { getByTestId } = render(<Probe />)
    // max(0, 24 + 44) = 68
    expect(getByTestId('inset').props.children).toBe('68')
  })

  it('falls back when header height under-reports (smaller than safe area + nav bar)', () => {
    mockUseHeaderHeight.mockReturnValue(56)
    mockUseSafeAreaInsets.mockReturnValue({ top: 32, right: 0, bottom: 0, left: 0 })
    const { getByTestId } = render(<Probe />)
    // 32 + 44 = 76; max(56, 76) = 76
    expect(getByTestId('inset').props.children).toBe('76')
  })

  it('handles a zero safe area (older devices) by returning the header height', () => {
    mockUseHeaderHeight.mockReturnValue(64)
    mockUseSafeAreaInsets.mockReturnValue({ top: 0, right: 0, bottom: 0, left: 0 })
    const { getByTestId } = render(<Probe />)
    // 0 + 44 = 44; max(64, 44) = 64
    expect(getByTestId('inset').props.children).toBe('64')
  })
})
