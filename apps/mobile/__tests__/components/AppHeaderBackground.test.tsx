import { render } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import AppHeaderBackground from '../../components/AppHeaderBackground'
import { darkTheme } from '../../lib/theme'

describe('AppHeaderBackground', () => {
  it('fills the header with the translucent canvas and a hairline bottom divider', () => {
    const { root } = render(<AppHeaderBackground />)
    const style = StyleSheet.flatten(root.props.style)
    expect(style.backgroundColor).toBe(darkTheme.colors.bg.headerTranslucent)
    expect(style.borderBottomColor).toBe(darkTheme.colors.border.hairline)
    expect(style.borderBottomWidth).toBe(StyleSheet.hairlineWidth)
  })
})
