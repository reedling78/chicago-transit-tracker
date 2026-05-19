import { render } from '@testing-library/react-native'
import TermsScreen from '../../app/(app)/terms'

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

describe('TermsScreen', () => {
  it('configures the traditional app header with the site title', () => {
    render(<TermsScreen />)
    expect(capturedScreenOptions).toHaveLength(1)
    const opts = capturedScreenOptions[0]
    expect(opts.headerTransparent).toBe(true)
    expect(opts.headerTitle).toBe('Chicago Transit Tracker')
    expect(opts.headerTitleAlign).toBe('left')
    expect(opts.headerLeft).toBeUndefined()
  })

  it('renders the page title and lede', () => {
    const { getByText } = render(<TermsScreen />)
    expect(getByText('Terms of Use')).toBeOnTheScreen()
    expect(
      getByText('Please read these terms before using Chicago Transit Tracker.'),
    ).toBeOnTheScreen()
  })

  it('renders the Metra-required disclaimer wording verbatim (compliance)', () => {
    const { getByText } = render(<TermsScreen />)
    expect(
      getByText(
        /not sponsored, affiliated, or operated by the Chicago Transit Authority \(CTA\), Metra/,
      ),
    ).toBeOnTheScreen()
  })

  it('renders all top-level sections', () => {
    const { getByText } = render(<TermsScreen />)
    expect(getByText('Overview')).toBeOnTheScreen()
    expect(getByText('Accuracy of Information')).toBeOnTheScreen()
    expect(getByText('No Warranty')).toBeOnTheScreen()
    expect(getByText('Intellectual Property')).toBeOnTheScreen()
    expect(getByText('External Links')).toBeOnTheScreen()
    expect(getByText('Changes to These Terms')).toBeOnTheScreen()
  })

  it('does not render the Footer', () => {
    const { queryByTestId } = render(<TermsScreen />)
    expect(queryByTestId('footer')).toBeNull()
  })
})
