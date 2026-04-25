import Hero from '@components/Hero'
import DashboardHeader from './DashboardHeader'
import FavoriteTrains from './FavoriteTrains'
import FavoriteStations from './FavoriteStations'
import FavoriteLines from './FavoriteLines'

export default function Dashboard() {
  return (
    <div>
      <DashboardHeader />
      <FavoriteTrains />
      <FavoriteStations />
      <FavoriteLines />
      <Hero />
    </div>
  )
}
