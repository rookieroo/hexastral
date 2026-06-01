import { SatelliteTabLayout } from '@zhop/satellite-ui'
import { Coins, UserCircle2 } from 'lucide-react-native'

export default function CoinCastTabsLayout() {
  return (
    <SatelliteTabLayout
      tabs={[
        { name: 'index', title: 'Oracle', icon: Coins },
        { name: 'me', title: 'Me', icon: UserCircle2 },
      ]}
    />
  )
}
