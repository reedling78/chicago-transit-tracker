import { useMemo } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTheme } from '../lib/theme'
import type { Theme } from '../lib/theme'

export interface LineTab {
  key: string
  label: string
}

interface LineTabsProps {
  tabs: LineTab[]
  activeKey: string
  onChange: (key: string) => void
}

/**
 * Generic segmented control used to switch between sections of a line screen.
 * Presentational only — the parent owns the active state.
 */
export default function LineTabs({ tabs, activeKey, onChange }: LineTabsProps) {
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])

  return (
    <View style={styles.row}>
      {tabs.map((tab) => {
        const active = tab.key === activeKey
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.button, active && styles.buttonActive]}
          >
            <Text style={[styles.text, active && styles.textActive]}>{tab.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      borderRadius: theme.radius.sm + 2,
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
      overflow: 'hidden',
    },
    button: {
      flex: 1,
      minHeight: 44,
      paddingVertical: theme.space[2],
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonActive: { backgroundColor: theme.colors.bg.surface },
    text: { fontSize: 14, fontWeight: '600', color: theme.colors.text.secondary },
    textActive: { color: theme.colors.text.primary },
  })
}
