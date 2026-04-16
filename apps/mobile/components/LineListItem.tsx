import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Link } from 'expo-router'
import type { ReactNode } from 'react'

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
  return (
    <Link href={href as never} asChild>
      <Pressable style={styles.card}>
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
      </Pressable>
    </Link>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#111827',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
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
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  iconContainer: {
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 2,
  },
  chevron: {
    color: '#4b5563',
    fontSize: 18,
  },
})
