import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'

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
  return (
    <Pressable
      onPress={() => router.push(href as never)}
      accessibilityRole="link"
      accessibilityLabel={label}
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
    </Pressable>
  )
}

export default function DashboardHero() {
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

const styles = StyleSheet.create({
  section: { gap: 12, marginTop: 8 },
  card: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
  },
  cardLabel: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  cardDescription: { color: '#9ca3af', fontSize: 13, marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  chipText: { color: '#fff', fontSize: 11, fontWeight: '600' },
})
