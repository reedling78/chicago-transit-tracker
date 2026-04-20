import { View, Text, Pressable, StyleSheet } from 'react-native'
import type { ServiceType } from '@ctt/shared'

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  weekday: 'Weekday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

export function todayServiceType(): ServiceType {
  const day = new Date().getDay()
  if (day === 6) return 'saturday'
  if (day === 0) return 'sunday'
  return 'weekday'
}

interface DirectionOption {
  key: string
  label: string
}

interface Props {
  directions: DirectionOption[]
  activeDirection: string
  onDirectionChange: (key: string) => void
  activeServiceType: ServiceType
  onServiceTypeChange: (type: ServiceType) => void
}

function ToggleRow<T extends string>({
  options,
  active,
  onChange,
}: {
  options: { key: T; label: string }[]
  active: T
  onChange: (key: T) => void
}) {
  return (
    <View style={styles.toggleRow}>
      {options.map((opt) => (
        <Pressable
          key={opt.key}
          onPress={() => onChange(opt.key)}
          style={[styles.toggleButton, active === opt.key && styles.toggleButtonActive]}
        >
          <Text style={[styles.toggleText, active === opt.key && styles.toggleTextActive]}>
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

export function TimetableFilterBar({
  directions,
  activeDirection,
  onDirectionChange,
  activeServiceType,
  onServiceTypeChange,
}: Props) {
  const serviceOptions = (Object.keys(SERVICE_TYPE_LABELS) as ServiceType[]).map((key) => ({
    key,
    label: SERVICE_TYPE_LABELS[key],
  }))

  return (
    <View style={styles.container}>
      {directions.length > 1 && (
        <ToggleRow options={directions} active={activeDirection} onChange={onDirectionChange} />
      )}
      <ToggleRow
        options={serviceOptions}
        active={activeServiceType}
        onChange={onServiceTypeChange}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 8, marginBottom: 12 },
  toggleRow: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#2a2a4a',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  toggleTextActive: {
    color: '#fff',
  },
})
