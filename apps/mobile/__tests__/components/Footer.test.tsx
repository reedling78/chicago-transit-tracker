import { render, fireEvent } from '@testing-library/react-native'

import Footer from '../../components/Footer'

// Override the global Footer stub from jest.setup.ts; this test renders the
// real component.
jest.unmock('../../components/Footer')

const mockPush = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

beforeEach(() => {
  jest.clearAllMocks()
})

describe('Footer', () => {
  it('renders Terms of Use and Privacy Policy links', () => {
    const { getByLabelText } = render(<Footer />)
    expect(getByLabelText('Terms of Use')).toBeOnTheScreen()
    expect(getByLabelText('Privacy Policy')).toBeOnTheScreen()
  })

  it('navigates to /terms when Terms of Use is pressed', () => {
    const { getByLabelText } = render(<Footer />)
    fireEvent.press(getByLabelText('Terms of Use'))
    expect(mockPush).toHaveBeenCalledWith('/terms')
  })

  it('navigates to /privacy when Privacy Policy is pressed', () => {
    const { getByLabelText } = render(<Footer />)
    fireEvent.press(getByLabelText('Privacy Policy'))
    expect(mockPush).toHaveBeenCalledWith('/privacy')
  })
})
