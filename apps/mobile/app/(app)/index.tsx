import { Stack } from 'expo-router'
import Dashboard from '../../components/dashboard/Dashboard'
import HeaderMenuButton from '../../components/HeaderMenuButton'
import { headerLeftItem, headerRightItem } from '../../lib/headerItems'

export default function HomeScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Chicago Transit Tracker',
          ...headerLeftItem(null),
          ...headerRightItem(<HeaderMenuButton />),
        }}
      />
      <Dashboard />
    </>
  )
}
