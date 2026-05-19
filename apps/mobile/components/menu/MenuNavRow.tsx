import { useMemo } from 'react'
import { StyleSheet, Text } from 'react-native'
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useTheme, type Theme } from '../../lib/theme'
import PressableButton from '../PressableButton'

interface MenuNavRowProps {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  href: string
  onNavigate: () => void
}

export default function MenuNavRow({ icon, label, href, onNavigate }: MenuNavRowProps) {
  const router = useRouter()
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
  return (
    <PressableButton
      onPress={() => {
        onNavigate()
        router.push(href as never)
      }}
      feedback="subtle"
      accessibilityRole="link"
      accessibilityLabel={label}
      style={styles.row}
    >
      <Ionicons name={icon} size={20} color={theme.colors.text.primary} />
      <Text style={styles.label}>{label}</Text>
    </PressableButton>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[3],
      paddingVertical: theme.space[3],
      paddingHorizontal: theme.space[2],
      minHeight: 44,
    },
    label: { color: theme.colors.text.primary, fontSize: 16, fontWeight: '600' },
  })
}
