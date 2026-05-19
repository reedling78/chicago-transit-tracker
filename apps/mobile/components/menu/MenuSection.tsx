import { useMemo, type ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '../../lib/theme'

export default function MenuSection({ title, children }: { title: string; children: ReactNode }) {
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.heading}>
        {title}
      </Text>
      <View>{children}</View>
    </View>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    section: { marginBottom: theme.space[6] },
    heading: {
      color: theme.colors.text.secondary,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: theme.space[2],
    },
  })
}
