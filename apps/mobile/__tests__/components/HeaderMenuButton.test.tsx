import { render, fireEvent } from '@testing-library/react-native'
import HeaderMenuButton from '../../components/HeaderMenuButton'

const mockDispatch = jest.fn()
jest.mock('expo-router', () => ({ useNavigation: () => ({ dispatch: mockDispatch }) }))
jest.mock('@react-navigation/native', () => ({
  DrawerActions: { openDrawer: () => ({ type: 'OPEN_DRAWER' }) },
}))
jest.mock('@expo/vector-icons/Ionicons', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return { __esModule: true, default: ({ name }: { name: string }) => <Text>{name}</Text> }
})
beforeEach(() => jest.clearAllMocks())

describe('HeaderMenuButton (mobile)', () => {
  it('opens the drawer on press', () => {
    const { getByLabelText, getByText } = render(<HeaderMenuButton />)
    expect(getByText('menu')).toBeTruthy()
    fireEvent.press(getByLabelText('Open menu'))
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'OPEN_DRAWER' })
  })
})
