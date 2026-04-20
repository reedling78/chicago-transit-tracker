import { Tabs } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import HeaderUserIcon from '../../components/HeaderUserIcon'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0a0a0a',
          borderTopColor: '#222',
        },
        tabBarActiveTintColor: '#60a5fa',
        tabBarInactiveTintColor: '#6b7280',
      }}
    >
      <Tabs.Screen
        name="my-trains"
        options={{
          title: 'My Trains',
          headerShown: true,
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerRight: () => <HeaderUserIcon />,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="train-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cta"
        options={{
          title: 'CTA',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="subway-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="metra"
        options={{
          title: 'Metra',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="train-sharp" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
