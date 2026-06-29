import {
  buildSatelliteTabScreenOptions,
  type SatelliteTabItem,
  useSatelliteTabScreenOptions,
} from '@zhop/satellite-ui'
import { Tabs } from 'expo-router'
import { Camera, UserCircle2 } from 'lucide-react-native'

const TABS: SatelliteTabItem[] = [
  { name: 'index', title: 'Home', icon: Camera },
  { name: 'me', title: 'Me', icon: UserCircle2 },
]

export default function FaceOracleTabsLayout() {
  const screenOptions = useSatelliteTabScreenOptions()

  return (
    <Tabs screenOptions={screenOptions}>
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={buildSatelliteTabScreenOptions(tab)} />
      ))}
    </Tabs>
  )
}
