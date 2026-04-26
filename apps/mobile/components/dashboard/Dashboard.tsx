import { ScrollView, StyleSheet } from 'react-native'
import { useNavHeaderInset } from '../../lib/useNavHeaderInset'
import DashboardGrid from './DashboardGrid'
import DashboardHero from './DashboardHero'

export default function Dashboard() {
  const headerInset = useNavHeaderInset()
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: headerInset + 8 }]}
    >
      <DashboardGrid />
      <DashboardHero />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1e' },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
})
