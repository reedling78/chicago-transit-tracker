import { View, ScrollView, StyleSheet } from 'react-native'
import { useNavHeaderInset } from '../../lib/useNavHeaderInset'
import MetraAlerts from '../../components/MetraAlerts'

export default function MetraAlertsScreen() {
  const headerInset = useNavHeaderInset()

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: headerInset + 16 }]}>
        <MetraAlerts />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
})
