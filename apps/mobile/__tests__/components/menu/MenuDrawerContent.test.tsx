import { render } from '@testing-library/react-native'
import MenuDrawerContent from '../../../components/menu/MenuDrawerContent'

jest.mock('@react-navigation/drawer', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ScrollView } = require('react-native')
  return {
    DrawerContentScrollView: ({ children }: { children: React.ReactNode }) => (
      <ScrollView>{children}</ScrollView>
    ),
  }
})
const mockUseAuth = jest.fn()
jest.mock('../../../lib/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('../../../components/profile/ProfilePanel', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return { __esModule: true, default: () => <Text>profile-panel</Text> }
})
jest.mock('../../../components/profile/FavoritesManager', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return { __esModule: true, default: () => <Text>favorites-manager</Text> }
})
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@expo/vector-icons/Ionicons', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return { __esModule: true, default: ({ name }: { name: string }) => <Text>{name}</Text> }
})
beforeEach(() => jest.clearAllMocks())

describe('MenuDrawerContent (mobile)', () => {
  const nav = { closeDrawer: jest.fn() } as never
  it('renders all four section headings and the dashboard + profile bodies', () => {
    mockUseAuth.mockReturnValue({ profile: { email: 'a@b.com' }, loading: false })
    const { getByText, getAllByText } = render(<MenuDrawerContent navigation={nav} />)
    expect(getByText('Menu')).toBeTruthy()
    expect(getAllByText('Dashboard').length).toBeGreaterThan(0)
    expect(getByText('Profile')).toBeTruthy()
    expect(getByText('Legal')).toBeTruthy()
    expect(getByText('favorites-manager')).toBeTruthy()
    expect(getByText('profile-panel')).toBeTruthy()
  })

  it('exposes section headings with the header accessibility role', () => {
    mockUseAuth.mockReturnValue({ profile: { email: 'a@b.com' }, loading: false })
    const { getByText } = render(<MenuDrawerContent navigation={nav} />)
    for (const heading of ['Menu', 'Profile', 'Legal']) {
      expect(getByText(heading).props.accessibilityRole).toBe('header')
    }
  })
})
