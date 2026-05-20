import Hero from '@components/Hero'
import DashboardHeader from './DashboardHeader'
import DashboardGrid from './DashboardGrid'
import DashboardItemsList from './DashboardItemsList'

export default function Dashboard() {
  return (
    <div>
      <DashboardHeader />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        <div>
          <DashboardGrid />
        </div>
        <div>
          <DashboardItemsList />
        </div>
      </div>
      <div className="mt-12">
        <Hero />
      </div>
    </div>
  )
}
