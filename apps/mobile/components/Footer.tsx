import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useTheme, type Theme } from '../lib/theme'

export default function Footer() {
  const router = useRouter()
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])

  return (
    <View style={styles.container} testID="footer">
      <Pressable
        onPress={() => router.push('/terms')}
        accessibilityRole="link"
        accessibilityLabel="Terms of Use"
        hitSlop={8}
      >
        {({ pressed }) => (
          <Text style={[styles.link, pressed && styles.linkPressed]}>Terms of Use</Text>
        )}
      </Pressable>
      <Text style={styles.divider}>·</Text>
      <Pressable
        onPress={() => router.push('/privacy')}
        accessibilityRole="link"
        accessibilityLabel="Privacy Policy"
        hitSlop={8}
      >
        {({ pressed }) => (
          <Text style={[styles.link, pressed && styles.linkPressed]}>Privacy Policy</Text>
        )}
      </Pressable>
    </View>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: theme.space[2],
      paddingVertical: theme.space[4],
      paddingHorizontal: theme.space[4],
      marginTop: theme.space[6],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border.subtle,
    },
    link: {
      color: theme.colors.text.muted,
      fontSize: 13,
    },
    linkPressed: {
      color: theme.colors.text.secondary,
    },
    divider: {
      color: theme.colors.text.muted,
      fontSize: 13,
    },
  })
}
