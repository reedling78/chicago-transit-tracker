import { useEffect, useRef } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import { useToggleDashboardItem } from '../lib/useToggleDashboardItem'
import { useAuth } from '../lib/AuthContext'
import { useDashboardStore } from '../lib/store/dashboard'
import type { DashboardItemType } from '@ctt/shared'
import PressableButton from './PressableButton'

interface Props {
  type: DashboardItemType
  id: string
}

export default function DashboardAddButton({ type, id }: Props) {
  const { user } = useAuth()
  const { isOnDashboard, toggle, isToggling, needsAuth } = useToggleDashboardItem(type, id)
  const router = useRouter()
  const pendingAddRef = useRef(false)

  useEffect(() => {
    if (user && pendingAddRef.current) {
      pendingAddRef.current = false
      if (!useDashboardStore.getState().has(type, id)) {
        toggle()
      }
    }
  }, [user, type, id, toggle])

  const handlePress = () => {
    if (needsAuth) {
      pendingAddRef.current = true
      router.push('/auth')
      return
    }
    toggle()
  }

  const label = isOnDashboard ? 'Remove from dashboard' : 'Add to dashboard'

  return (
    <PressableButton
      onPress={handlePress}
      disabled={isToggling}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isOnDashboard, disabled: isToggling }}
      feedback="default"
      haptic="light"
      style={[
        styles.button,
        {
          backgroundColor: isOnDashboard ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.22)',
          borderColor: 'rgba(255,255,255,0.25)',
        },
      ]}
    >
      <View style={styles.row}>
        <Ionicons name={isOnDashboard ? 'checkmark' : 'add'} size={12} color="#fff" />
        <Text style={styles.label}>{isOnDashboard ? 'On Dashboard' : 'Dashboard'}</Text>
      </View>
    </PressableButton>
  )
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  label: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
})
