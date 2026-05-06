import { StyleSheet, View } from 'react-native'
import { useNavHeaderInset } from '../../lib/useNavHeaderInset'
import DashboardHeader from './DashboardHeader'
import DashboardGrid from './DashboardGrid'
import DashboardHero from './DashboardHero'

export default function Dashboard() {
  const headerInset = useNavHeaderInset()
  return (
    <View style={styles.container}>
      <DashboardGrid
        contentTopInset={headerInset + 8}
        header={<DashboardHeader />}
        footer={<DashboardHero />}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1e' },
})
