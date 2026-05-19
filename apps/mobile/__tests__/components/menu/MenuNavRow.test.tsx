import { render, fireEvent } from '@testing-library/react-native'
import MenuNavRow from '../../../components/menu/MenuNavRow'

const mockPush = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('@expo/vector-icons/Ionicons', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return { __esModule: true, default: ({ name }: { name: string }) => <Text>{name}</Text> }
})
beforeEach(() => jest.clearAllMocks())

describe('MenuNavRow (mobile)', () => {
  it('closes the drawer then navigates on press', () => {
    const onNavigate = jest.fn()
    const { getByLabelText } = render(
      <MenuNavRow icon="home-outline" label="Dashboard" href="/" onNavigate={onNavigate} />,
    )
    fireEvent.press(getByLabelText('Dashboard'))
    expect(onNavigate).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/')
  })
})
