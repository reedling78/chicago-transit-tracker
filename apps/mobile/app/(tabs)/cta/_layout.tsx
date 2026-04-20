import { Stack } from 'expo-router'
import HeaderUserIcon from '../../../components/HeaderUserIcon'

export default function CtaStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerRight: () => <HeaderUserIcon />,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'CTA Lines' }} />
    </Stack>
  )
}
