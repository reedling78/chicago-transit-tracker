import { useMemo, type ReactNode } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useTheme } from '../lib/theme'
import type { Theme } from '../lib/theme'
import PressableButton from './PressableButton'

type LineListItemProps = {
  href: string
  title: string
  subtitle: string
  accentColor: string
  icon?: ReactNode
}

export default function LineListItem({
  href,
  title,
  subtitle,
  accentColor,
  icon,
}: LineListItemProps) {
  const router = useRouter()
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
  return (
    <PressableButton
      onPress={() => router.push(href as never)}
      accessibilityRole="link"
      accessibilityLabel={title}
      feedback="subtle"
      style={styles.card}
    >
      <View style={[styles.accent, { backgroundColor: accentColor }]} />
      <View style={styles.content}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <Text style={styles.chevron}>→</Text>
      </View>
    </PressableButton>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'stretch',
      backgroundColor: theme.colors.bg.elevated,
      borderRadius: theme.radius.sm + 2,
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
      overflow: 'hidden',
    },
    accent: {
      width: 4,
    },
    content: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.space[3],
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[4],
    },
    iconContainer: {
      flexShrink: 0,
    },
    textContainer: {
      flex: 1,
    },
    title: {
      color: theme.colors.text.primary,
      fontSize: 16,
      fontWeight: '500',
    },
    subtitle: {
      color: theme.colors.text.secondary,
      fontSize: 13,
      marginTop: 2,
    },
    chevron: {
      color: theme.colors.text.muted,
      fontSize: 18,
    },
  })
}
