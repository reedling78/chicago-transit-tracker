import { Stack } from 'expo-router'
import Dashboard from '../components/dashboard/Dashboard'

export default function HomeScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Dashboard />
    </>
  )
}
