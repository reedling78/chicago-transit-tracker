import { Stack } from 'expo-router'
import HeaderUserIcon from '../../../components/HeaderUserIcon'

export default function MetraStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerRight: () => <HeaderUserIcon />,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Metra Lines' }} />
    </Stack>
  )
}
