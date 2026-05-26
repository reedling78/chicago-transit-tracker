import { render } from '@testing-library/react-native'
import PrivacyScreen from '../../app/(app)/privacy'

const capturedScreenOptions: Record<string, unknown>[] = []

jest.mock('expo-router', () => {
  const StackScreen = (props: { options?: Record<string, unknown> }) => {
    capturedScreenOptions.push(props.options ?? {})
    return null
  }
  StackScreen.displayName = 'StackScreen'
  return {
    Stack: { Screen: StackScreen },
    useRouter: () => ({ push: jest.fn() }),
  }
})

jest.mock('../../lib/useNavHeaderInset', () => ({
  useNavHeaderInset: () => 64,
}))

beforeEach(() => {
  capturedScreenOptions.length = 0
})

describe('PrivacyScreen', () => {
  it('configures the traditional app header with the site title', () => {
    render(<PrivacyScreen />)
    expect(capturedScreenOptions).toHaveLength(1)
    const opts = capturedScreenOptions[0]
    // Shared header chrome is inherited from the Stack; the screen only sets the title.
    expect(opts.headerTitle).toBe('Chicago Transit Tracker')
    expect(opts.headerLeft).toBeUndefined()
  })

  it('renders the page title and lede', () => {
    const { getByText } = render(<PrivacyScreen />)
    expect(getByText('Privacy Policy')).toBeOnTheScreen()
    expect(getByText('How Chicago Transit Tracker handles your information.')).toBeOnTheScreen()
  })

  it('renders all top-level sections', () => {
    const { getByText } = render(<PrivacyScreen />)
    expect(getByText('Overview')).toBeOnTheScreen()
    expect(getByText('Information We Collect')).toBeOnTheScreen()
    expect(getByText('On-Device Storage')).toBeOnTheScreen()
    expect(getByText('How We Use Data')).toBeOnTheScreen()
    expect(getByText('Third-Party Services')).toBeOnTheScreen()
    expect(getByText('Your Choices')).toBeOnTheScreen()
    expect(getByText('Changes to This Policy')).toBeOnTheScreen()
  })

  it('does not render the Footer', () => {
    const { queryByTestId } = render(<PrivacyScreen />)
    expect(queryByTestId('footer')).toBeNull()
  })

  it('discloses that analytics is provided via Firebase Analytics', () => {
    const { getByText } = render(<PrivacyScreen />)
    expect(
      getByText(/google analytics 4 via firebase analytics/i, { exact: false }),
    ).toBeOnTheScreen()
  })

  it('discloses user-ID linkage for signed-in users and the PII exclusion', () => {
    const { getByText } = render(<PrivacyScreen />)
    expect(
      getByText(/firebase authentication user id is associated with these analytics/i, {
        exact: false,
      }),
    ).toBeOnTheScreen()
    expect(
      getByText(/send your email address, display name, or profile photo/i, { exact: false }),
    ).toBeOnTheScreen()
  })

  it('notes that the app does not collect IDFA / AAID', () => {
    const { getByText } = render(<PrivacyScreen />)
    expect(getByText(/does not collect idfa/i, { exact: false })).toBeOnTheScreen()
    expect(
      getByText(/does not trigger app tracking transparency prompts/i, { exact: false }),
    ).toBeOnTheScreen()
  })
})
