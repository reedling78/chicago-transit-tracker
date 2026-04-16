import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import LineListItem from '../../components/LineListItem'

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}))

describe('LineListItem', () => {
  const defaultProps = {
    href: '/cta/red',
    title: 'Red Line',
    subtitle: 'Howard — 95th/Dan Ryan',
    accentColor: '#c60c30',
  }

  it('renders the title and subtitle', () => {
    render(<LineListItem {...defaultProps} />)
    expect(screen.getByText('Red Line')).toBeOnTheScreen()
    expect(screen.getByText('Howard — 95th/Dan Ryan')).toBeOnTheScreen()
  })

  it('renders a chevron arrow', () => {
    render(<LineListItem {...defaultProps} />)
    expect(screen.getByText('→')).toBeOnTheScreen()
  })

  it('renders an icon when provided', () => {
    render(<LineListItem {...defaultProps} icon={<Text testID="test-icon">IC</Text>} />)
    expect(screen.getByTestId('test-icon')).toBeOnTheScreen()
  })

  it('does not render an icon container when icon is omitted', () => {
    const { toJSON } = render(<LineListItem {...defaultProps} />)
    expect(screen.queryByTestId('test-icon')).toBeNull()
    expect(toJSON()).toBeTruthy()
  })
})
