import { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useTheme } from '../../lib/theme'
import type { Theme } from '../../lib/theme'
import PressableButton from '../PressableButton'

const CTA_LINES = [
  { name: 'Red', color: '#C60C30' },
  { name: 'Blue', color: '#00A1DE' },
  { name: 'Green', color: '#009B3A' },
  { name: 'Brown', color: '#62361B' },
  { name: 'Purple', color: '#522398' },
  { name: 'Pink', color: '#E27EA6' },
  { name: 'Orange', color: '#F9461C' },
  { name: 'Yellow', color: '#F9E300' },
]

const METRA_LINES = [
  { name: 'BNSF', color: '#1A3D7A' },
  { name: 'UP-N', color: '#007B40' },
  { name: 'MD-N', color: '#C8872A' },
  { name: 'RI', color: '#BE0000' },
  { name: 'ME', color: '#003DA5' },
]

interface CardProps {
  href: string
  label: string
  description: string
  lines: { name: string; color: string }[]
}

function ServiceCard({ href, label, description, lines }: CardProps) {
  const router = useRouter()
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
  return (
    <PressableButton
      onPress={() => router.push(href as never)}
      accessibilityRole="link"
      accessibilityLabel={label}
      feedback="subtle"
      style={styles.card}
    >
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
      <View style={styles.chipRow}>
        {lines.map((line) => (
          <View key={line.name} style={[styles.chip, { backgroundColor: line.color }]}>
            <Text style={styles.chipText}>{line.name}</Text>
          </View>
        ))}
      </View>
    </PressableButton>
  )
}

export default function DashboardHero() {
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
  return (
    <View style={styles.section}>
      <ServiceCard
        href="/cta"
        label="CTA"
        description="Real-time tracking and schedules for 8 rapid transit lines."
        lines={CTA_LINES}
      />
      <ServiceCard
        href="/metra"
        label="Metra"
        description="Real-time tracking and schedules for 11 commuter rail lines."
        lines={METRA_LINES}
      />
    </View>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    section: { gap: theme.space[3], marginTop: theme.space[2] },
    card: {
      backgroundColor: theme.colors.bg.surface,
      borderRadius: theme.radius.md,
      padding: theme.space[4],
    },
    cardLabel: {
      color: theme.colors.text.primary,
      fontSize: 22,
      fontWeight: '700',
      marginBottom: theme.space[1],
    },
    cardDescription: {
      color: theme.colors.text.secondary,
      fontSize: 13,
      marginBottom: theme.space[3],
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[1] + 2 },
    chip: {
      paddingHorizontal: theme.space[2],
      paddingVertical: theme.space[1],
      borderRadius: theme.radius.full,
    },
    // Chips render saturated CTA/Metra brand colors as bg, so chip text is
    // always near-white regardless of mode.
    chipText: { color: theme.colors.text.onScrim, fontSize: 11, fontWeight: '600' },
  })
}
