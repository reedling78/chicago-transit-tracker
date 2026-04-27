import Hero from '@components/Hero'
import DashboardHeader from './DashboardHeader'
import DashboardGrid from './DashboardGrid'

export default function Dashboard() {
  return (
    <div>
      <DashboardHeader />
      <DashboardGrid />
      <div className="mt-12">
        <Hero />
      </div>
    </div>
  )
}
