import Hero from '@components/Hero'
import FavoriteTrains from './FavoriteTrains'
import FavoriteStations from './FavoriteStations'
import FavoriteLines from './FavoriteLines'

export default function Dashboard() {
  return (
    <div>
      <Hero />
      <div className="mt-12">
        <FavoriteTrains />
        <FavoriteStations />
        <FavoriteLines />
      </div>
    </div>
  )
}
