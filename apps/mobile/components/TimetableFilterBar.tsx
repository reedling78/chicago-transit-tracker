import { useMemo } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import type { ServiceType } from '@ctt/shared'
import { useTheme } from '../lib/theme'
import type { Theme } from '../lib/theme'

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
  styles,
}: {
  options: { key: T; label: string }[]
  active: T
  onChange: (key: T) => void
  styles: ReturnType<typeof makeStyles>
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
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
  const serviceOptions = (Object.keys(SERVICE_TYPE_LABELS) as ServiceType[]).map((key) => ({
    key,
    label: SERVICE_TYPE_LABELS[key],
  }))

  return (
    <View style={styles.container}>
      {directions.length > 1 && (
        <ToggleRow
          options={directions}
          active={activeDirection}
          onChange={onDirectionChange}
          styles={styles}
        />
      )}
      <ToggleRow
        options={serviceOptions}
        active={activeServiceType}
        onChange={onServiceTypeChange}
        styles={styles}
      />
    </View>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { gap: theme.space[2], marginBottom: theme.space[3] },
    toggleRow: {
      flexDirection: 'row',
      borderRadius: theme.radius.sm + 2,
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
      overflow: 'hidden',
    },
    toggleButton: { flex: 1, paddingVertical: theme.space[2], alignItems: 'center' },
    toggleButtonActive: { backgroundColor: theme.colors.bg.surface },
    toggleText: { fontSize: 13, fontWeight: '600', color: theme.colors.text.secondary },
    toggleTextActive: { color: theme.colors.text.primary },
  })
}
