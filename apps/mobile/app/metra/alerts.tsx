import { View, ScrollView, StyleSheet } from 'react-native'
import { useNavHeaderInset } from '../../lib/useNavHeaderInset'
import { useTheme } from '../../lib/theme'
import MetraAlerts from '../../components/MetraAlerts'
import Footer from '../../components/Footer'

export default function MetraAlertsScreen() {
  const headerInset = useNavHeaderInset()
  const { theme } = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg.canvas }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: headerInset + 16 }]}>
        <MetraAlerts />
        <Footer />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
})
