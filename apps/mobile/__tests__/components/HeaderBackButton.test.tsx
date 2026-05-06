import { render, fireEvent } from '@testing-library/react-native'
import HeaderBackButton from '../../components/HeaderBackButton'

const mockGoBack = jest.fn()
const mockCanGoBack = jest.fn()

jest.mock('expo-router', () => ({
  useNavigation: () => ({
    canGoBack: () => mockCanGoBack(),
    goBack: () => mockGoBack(),
  }),
}))

jest.mock('@expo/vector-icons/Ionicons', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return {
    __esModule: true,
    default: ({ name }: { name: string }) => <Text>{name}</Text>,
  }
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('HeaderBackButton', () => {
  it('renders nothing when navigation cannot go back', () => {
    mockCanGoBack.mockReturnValue(false)
    const { queryByLabelText } = render(<HeaderBackButton />)
    expect(queryByLabelText('Back')).toBeNull()
  })

  it('renders a back button when navigation can go back', () => {
    mockCanGoBack.mockReturnValue(true)
    const { getByLabelText } = render(<HeaderBackButton />)
    expect(getByLabelText('Back')).toBeOnTheScreen()
  })

  it('calls navigation.goBack when pressed', () => {
    mockCanGoBack.mockReturnValue(true)
    const { getByLabelText } = render(<HeaderBackButton />)
    fireEvent.press(getByLabelText('Back'))
    expect(mockGoBack).toHaveBeenCalledTimes(1)
  })

  it('renders the chevron-back icon inside the button', () => {
    mockCanGoBack.mockReturnValue(true)
    const { getByText } = render(<HeaderBackButton />)
    expect(getByText('chevron-back')).toBeOnTheScreen()
  })

  it('exposes a generous hit area so taps near the edge still register', () => {
    mockCanGoBack.mockReturnValue(true)
    const { getByLabelText } = render(<HeaderBackButton />)
    const button = getByLabelText('Back')
    expect(button.props.hitSlop).toEqual({ top: 12, bottom: 12, left: 16, right: 12 })
  })
})
