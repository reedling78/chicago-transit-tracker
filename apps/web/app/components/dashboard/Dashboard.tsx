import Hero from '@components/Hero'
import DashboardGrid from './DashboardGrid'

export default function Dashboard() {
  return (
    <div>
      <DashboardGrid />
      <div className="mt-12">
        <Hero />
      </div>
    </div>
  )
}
