import { Stack } from 'expo-router'
import Dashboard from '../../components/dashboard/Dashboard'
import HeaderMenuButton from '../../components/HeaderMenuButton'
import { useTheme } from '../../lib/theme'

export default function HomeScreen() {
  const { theme } = useTheme()
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerStyle: { backgroundColor: theme.colors.bg.canvas },
          headerShadowVisible: false,
          headerTitle: 'Chicago Transit Tracker',
          headerTitleAlign: 'left',
          headerTitleStyle: { color: theme.colors.text.primary, fontWeight: '700' },
          headerLeft: () => null,
          headerRight: () => <HeaderMenuButton />,
        }}
      />
      <Dashboard />
    </>
  )
}
