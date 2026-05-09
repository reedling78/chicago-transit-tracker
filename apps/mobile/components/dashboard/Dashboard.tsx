import { View } from 'react-native'
import { useNavHeaderInset } from '../../lib/useNavHeaderInset'
import { useTheme } from '../../lib/theme'
import DashboardHeader from './DashboardHeader'
import DashboardGrid from './DashboardGrid'
import DashboardHero from './DashboardHero'
import Footer from '../Footer'

export default function Dashboard() {
  const headerInset = useNavHeaderInset()
  const { theme } = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg.canvas }}>
      <DashboardGrid
        contentTopInset={headerInset + 8}
        header={<DashboardHeader />}
        footer={
          <>
            <DashboardHero />
            <Footer />
          </>
        }
      />
    </View>
  )
}
