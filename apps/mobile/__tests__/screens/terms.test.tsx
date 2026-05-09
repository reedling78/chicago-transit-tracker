import { render } from '@testing-library/react-native'
import TermsScreen from '../../app/terms'

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('../../lib/useNavHeaderInset', () => ({
  useNavHeaderInset: () => 64,
}))

describe('TermsScreen', () => {
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

  it('renders the Footer at the end of the scroll content', () => {
    const { getByTestId } = render(<TermsScreen />)
    expect(getByTestId('footer')).toBeOnTheScreen()
  })
})
