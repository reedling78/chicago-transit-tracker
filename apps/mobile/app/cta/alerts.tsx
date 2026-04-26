import { View, ScrollView, StyleSheet } from 'react-native'
import { useNavHeaderInset } from '../../lib/useNavHeaderInset'
import CTAAlerts from '../../components/CTAAlerts'

export default function CtaAlertsScreen() {
  const headerInset = useNavHeaderInset()

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: headerInset + 16 }]}>
        <CTAAlerts />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
})
