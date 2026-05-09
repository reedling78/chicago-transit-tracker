import { render } from '@testing-library/react-native'
import PrivacyScreen from '../../app/privacy'

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('../../lib/useNavHeaderInset', () => ({
  useNavHeaderInset: () => 64,
}))

describe('PrivacyScreen', () => {
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

  it('renders the Footer at the end of the scroll content', () => {
    const { getByTestId } = render(<PrivacyScreen />)
    expect(getByTestId('footer')).toBeOnTheScreen()
  })
})
