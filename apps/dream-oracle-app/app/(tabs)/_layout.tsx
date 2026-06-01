import { SatelliteTabLayout } from '@zhop/satellite-ui'
import { Moon, UserCircle2 } from 'lucide-react-native'

export default function DreamOracleTabsLayout() {
  return (
    <SatelliteTabLayout
      tabs={[
        { name: 'index', title: 'Home', icon: Moon },
        { name: 'me', title: 'Me', icon: UserCircle2 },
      ]}
    />
  )
}
