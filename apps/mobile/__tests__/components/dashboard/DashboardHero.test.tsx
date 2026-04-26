import { render, fireEvent } from '@testing-library/react-native'

import DashboardHero from '../../../components/dashboard/DashboardHero'

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

beforeEach(() => {
  jest.clearAllMocks()
})

describe('DashboardHero (mobile)', () => {
  it('renders both CTA and Metra service cards', () => {
    const { getByLabelText } = render(<DashboardHero />)
    expect(getByLabelText('CTA')).toBeTruthy()
    expect(getByLabelText('Metra')).toBeTruthy()
  })

  it('routes to /(tabs)/cta when the CTA card is pressed', () => {
    const { getByLabelText } = render(<DashboardHero />)
    fireEvent.press(getByLabelText('CTA'))
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/cta')
  })

  it('routes to /(tabs)/metra when the Metra card is pressed', () => {
    const { getByLabelText } = render(<DashboardHero />)
    fireEvent.press(getByLabelText('Metra'))
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/metra')
  })
})
