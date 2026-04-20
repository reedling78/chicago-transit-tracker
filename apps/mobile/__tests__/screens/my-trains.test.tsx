import { render, screen } from '@testing-library/react-native'
import MyTrainsScreen from '../../app/(tabs)/my-trains'

describe('MyTrainsScreen', () => {
  it('renders the Coming Soon placeholder', () => {
    render(<MyTrainsScreen />)
    expect(screen.getByText('Coming Soon')).toBeOnTheScreen()
  })
})
