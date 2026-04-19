import { render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import PageHeader from '../../components/PageHeader'

jest.mock('expo-linear-gradient', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native')
  return {
    LinearGradient: (props: any) => <View {...props} />,
  }
})

describe('PageHeader', () => {
  it('renders the title', () => {
    render(<PageHeader title="CTA Lines" />)
    expect(screen.getByText('CTA Lines')).toBeOnTheScreen()
  })

  it('renders the description when provided', () => {
    render(<PageHeader title="CTA Lines" description="Rapid transit lines" />)
    expect(screen.getByText('Rapid transit lines')).toBeOnTheScreen()
  })

  it('does not render description when omitted', () => {
    render(<PageHeader title="CTA Lines" />)
    expect(screen.queryByText('Rapid transit lines')).toBeNull()
  })

  it('renders badges when provided', () => {
    render(<PageHeader title="Red Line" badges={<Text testID="badge">Rapid Transit</Text>} />)
    expect(screen.getByTestId('badge')).toBeOnTheScreen()
  })

  it('renders icon inline with title', () => {
    render(<PageHeader title="Red Line" icon={<Text testID="icon">IC</Text>} />)
    expect(screen.getByTestId('icon')).toBeOnTheScreen()
    expect(screen.getByText('Red Line')).toBeOnTheScreen()
  })

  it('renders children', () => {
    render(
      <PageHeader title="Station">
        <Text testID="child">Line chips</Text>
      </PageHeader>,
    )
    expect(screen.getByTestId('child')).toBeOnTheScreen()
  })

  it('accepts breadcrumbItems without crashing', () => {
    render(
      <PageHeader
        title="Red Line"
        breadcrumbItems={[{ label: 'CTA Lines', href: '/cta' }, { label: 'Red Line' }]}
      />,
    )
    expect(screen.getByText('Red Line')).toBeOnTheScreen()
  })
})
