import { StyleSheet, View } from 'react-native'
import { useTheme } from '../lib/theme'

// Used as the navigator's `headerBackground`. The Stack stays `headerTransparent`,
// so this fill sits over the content/photo; its sub-1.0 alpha lets that content
// stay faintly visible behind the bar. The bottom hairline is the divider.
export default function AppHeaderBackground() {
  const { theme } = useTheme()
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: theme.colors.bg.headerTranslucent,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border.hairline,
        },
      ]}
    />
  )
}
