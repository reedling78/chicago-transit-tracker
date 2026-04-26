import { ScrollView, StyleSheet } from 'react-native'
import DashboardHeader from './DashboardHeader'
import FavoriteTrains from './FavoriteTrains'
import FavoriteStations from './FavoriteStations'
import FavoriteLines from './FavoriteLines'
import DashboardHero from './DashboardHero'

export default function Dashboard() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <DashboardHeader />
      <FavoriteTrains />
      <FavoriteStations />
      <FavoriteLines />
      <DashboardHero />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1e' },
  content: { padding: 16, paddingBottom: 40 },
})
