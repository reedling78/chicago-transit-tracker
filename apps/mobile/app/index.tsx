import { Stack } from 'expo-router'
import Dashboard from '../components/dashboard/Dashboard'
import HeaderUserIcon from '../components/HeaderUserIcon'

export default function HomeScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Chicago Transit Tracker',
          headerTitleAlign: 'left',
          headerTitleStyle: { color: '#fff', fontSize: 17, fontWeight: '700' },
          headerRight: () => <HeaderUserIcon />,
        }}
      />
      <Dashboard />
    </>
  )
}
