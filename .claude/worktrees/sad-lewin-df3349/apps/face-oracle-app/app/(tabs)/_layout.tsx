import { SatelliteTabLayout } from '@zhop/satellite-ui'
import { Camera, UserCircle2 } from 'lucide-react-native'

export default function FaceOracleTabsLayout() {
  return (
    <SatelliteTabLayout
      tabs={[
        { name: 'index', title: 'Home', icon: Camera },
        { name: 'me', title: 'Me', icon: UserCircle2 },
      ]}
    />
  )
}
