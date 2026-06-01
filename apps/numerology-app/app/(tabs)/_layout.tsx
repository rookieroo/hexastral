import { SatelliteTabLayout } from '@zhop/satellite-ui'
import { Hash, UserCircle2 } from 'lucide-react-native'

export default function NumerologyTabsLayout() {
  return (
    <SatelliteTabLayout
      tabs={[
        { name: 'index', title: 'Numbers', icon: Hash },
        { name: 'me', title: 'Me', icon: UserCircle2 },
      ]}
    />
  )
}
