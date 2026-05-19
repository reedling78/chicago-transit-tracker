import { Stack } from 'expo-router'
import Dashboard from '../../components/dashboard/Dashboard'
import HeaderMenuButton from '../../components/HeaderMenuButton'

export default function HomeScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Chicago Transit Tracker',
          headerLeft: () => null,
          headerRight: () => <HeaderMenuButton />,
        }}
      />
      <Dashboard />
    </>
  )
}
