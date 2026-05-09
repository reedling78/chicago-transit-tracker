import { View, ScrollView, StyleSheet } from 'react-native'
import { useNavHeaderInset } from '../../lib/useNavHeaderInset'
import { useTheme } from '../../lib/theme'
import CTAAlerts from '../../components/CTAAlerts'
import Footer from '../../components/Footer'

export default function CtaAlertsScreen() {
  const headerInset = useNavHeaderInset()
  const { theme } = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg.canvas }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: headerInset + 16 }]}>
        <CTAAlerts />
        <Footer />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
})
