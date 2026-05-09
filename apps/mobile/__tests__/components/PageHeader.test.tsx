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

jest.mock('../../lib/useNavHeaderInset', () => ({
  useNavHeaderInset: () => 64,
}))

jest.mock('../../components/FavoriteButton', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return {
    __esModule: true,
    default: ({ type, id }: { type: string; id: string }) => (
      <Text testID="favorite-button">{`${type}:${id}`}</Text>
    ),
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

  it('renders FavoriteButton when favorite prop is provided', () => {
    render(<PageHeader title="Red Line" favorite={{ type: 'line', id: 'red' }} />)
    expect(screen.getByTestId('favorite-button').props.children).toBe('line:red')
  })

  it('does not render FavoriteButton when favorite prop is omitted', () => {
    render(<PageHeader title="Red Line" />)
    expect(screen.queryByTestId('favorite-button')).toBeNull()
  })

  it('renders without a title when title is omitted', () => {
    render(
      <PageHeader description="A station">
        <Text testID="child">chips</Text>
      </PageHeader>,
    )
    expect(screen.getByText('A station')).toBeOnTheScreen()
    expect(screen.getByTestId('child')).toBeOnTheScreen()
  })

  it('extends the hero height by the navigator header height so content sits below it', () => {
    const { UNSAFE_root } = render(<PageHeader title="Red Line" />)
    // Outermost View — first child of the test root
    const container = UNSAFE_root.findAllByType(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('react-native').View,
    )[0]
    const flat = (
      Array.isArray(container.props.style) ? container.props.style.flat() : [container.props.style]
    ).reduce<Record<string, unknown>>((acc, s) => ({ ...acc, ...(s ?? {}) }), {})
    // 200 (hero) + 64 (mocked useNavHeaderInset)
    expect(flat.height).toBe(264)
  })

  it('uses a shorter content height when compact is set', () => {
    const { UNSAFE_root } = render(<PageHeader title="Red Line" compact />)
    const container = UNSAFE_root.findAllByType(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('react-native').View,
    )[0]
    const flat = (
      Array.isArray(container.props.style) ? container.props.style.flat() : [container.props.style]
    ).reduce<Record<string, unknown>>((acc, s) => ({ ...acc, ...(s ?? {}) }), {})
    // 140 (compact hero) + 64 (mocked useNavHeaderInset)
    expect(flat.height).toBe(204)
  })

  it('shrinks the title font size when compact is set', () => {
    render(<PageHeader title="Red Line" compact />)
    const titleNode = screen.getByText('Red Line')
    const flat = (
      Array.isArray(titleNode.props.style) ? titleNode.props.style.flat() : [titleNode.props.style]
    ).reduce<Record<string, unknown>>((acc, s) => ({ ...acc, ...(s ?? {}) }), {})
    expect(flat.fontSize).toBe(19)
  })
})
