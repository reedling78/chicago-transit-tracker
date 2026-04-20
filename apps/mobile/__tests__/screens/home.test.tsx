import { render } from '@testing-library/react-native'
import HomeScreen from '../../app/index'

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native')
    return <Text>{`Redirect:${href}`}</Text>
  },
}))

describe('HomeScreen', () => {
  it('redirects to the My Trains tab', () => {
    const { getByText } = render(<HomeScreen />)
    expect(getByText('Redirect:/(tabs)/my-trains')).toBeOnTheScreen()
  })
})
