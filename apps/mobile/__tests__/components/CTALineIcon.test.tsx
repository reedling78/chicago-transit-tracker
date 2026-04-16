import { render } from '@testing-library/react-native'
import CTALineIcon from '../../components/CTALineIcon'

jest.mock('react-native-svg', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native')
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => <View {...props} />,
    Path: (props: Record<string, unknown>) => <View {...props} />,
    Rect: (props: Record<string, unknown>) => <View {...props} />,
    G: (props: Record<string, unknown>) => <View {...props} />,
  }
})

describe('CTALineIcon', () => {
  it('renders for a valid CTA line', () => {
    const { toJSON } = render(<CTALineIcon line="Red" size={36} />)
    expect(toJSON()).toBeTruthy()
  })

  it('returns null for an unknown line', () => {
    const { toJSON } = render(<CTALineIcon line="Nonexistent" />)
    expect(toJSON()).toBeNull()
  })

  it('uses default size of 40 when size is omitted', () => {
    const { toJSON } = render(<CTALineIcon line="Blue" />)
    const tree = toJSON() as { props: { style: { width: number; height: number }[] } }
    const flatStyle = Object.assign({}, ...tree.props.style)
    expect(flatStyle.width).toBe(40)
    expect(flatStyle.height).toBe(40)
  })
})
