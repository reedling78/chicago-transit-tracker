import Hero from '@components/Hero'
import DashboardGrid from './DashboardGrid'

export default function Dashboard() {
  return (
    <div>
      <Hero />
      <div className="mt-12">
        <DashboardGrid />
      </div>
    </div>
  )
}
