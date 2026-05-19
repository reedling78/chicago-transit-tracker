import { Drawer } from 'expo-router/drawer'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import { AuthProvider } from '../lib/AuthContext'
import { ThemeProvider } from '../lib/theme'
import QueryProvider from '../components/QueryProvider'
import MenuDrawerContent from '../components/menu/MenuDrawerContent'

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <QueryProvider>
          <AuthProvider>
            <BottomSheetModalProvider>
              <SafeAreaProvider>
                <Drawer
                  drawerContent={(props) => <MenuDrawerContent {...props} />}
                  screenOptions={{
                    headerShown: false,
                    drawerType: 'front',
                    drawerStyle: { width: '85%', maxWidth: 360 },
                    swipeEdgeWidth: 40,
                  }}
                >
                  <Drawer.Screen name="(app)" />
                </Drawer>
              </SafeAreaProvider>
            </BottomSheetModalProvider>
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}
