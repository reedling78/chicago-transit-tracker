import { render } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import MenuDrawerContent from '../../../components/menu/MenuDrawerContent'

jest.mock('@react-navigation/drawer', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ScrollView } = require('react-native')
  return {
    DrawerContentScrollView: ({
      children,
      contentContainerStyle,
    }: {
      children: React.ReactNode
      contentContainerStyle?: unknown
    }) => (
      <ScrollView testID="drawer-scroll" contentContainerStyle={contentContainerStyle}>
        {children}
      </ScrollView>
    ),
  }
})
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}))
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

  it('insets the scroll content past the safe area (status bar / home indicator)', () => {
    mockUseAuth.mockReturnValue({ profile: { email: 'a@b.com' }, loading: false })
    const { getByTestId } = render(<MenuDrawerContent navigation={nav} />)
    const style = StyleSheet.flatten(getByTestId('drawer-scroll').props.contentContainerStyle)
    // paddingTop must exceed the 47px top inset (inset + section spacing),
    // so menu content never sits under the status bar / notch.
    expect(style.paddingTop).toBeGreaterThan(47)
    expect(style.paddingBottom).toBeGreaterThan(34)
  })

  it('exposes section headings with the header accessibility role', () => {
    mockUseAuth.mockReturnValue({ profile: { email: 'a@b.com' }, loading: false })
    const { getByText } = render(<MenuDrawerContent navigation={nav} />)
    for (const heading of ['Menu', 'Profile', 'Legal']) {
      expect(getByText(heading).props.accessibilityRole).toBe('header')
    }
  })
})
