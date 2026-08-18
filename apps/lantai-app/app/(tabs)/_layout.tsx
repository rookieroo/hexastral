import { useSatelliteTabScreenOptions } from '@zhop/satellite-ui'
import { Tabs } from 'expo-router'
import { LayoutList, LayoutTemplate, User } from 'lucide-react-native'

import { useSatelliteI18n } from '@/lib/i18n'

export default function LantaiTabsLayout() {
  const { t } = useSatelliteI18n()
  const screenOptions = useSatelliteTabScreenOptions()

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name='index'
        options={{
          title: t('tabSlots'),
          tabBarIcon: ({ color, size }) => <LayoutList color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name='templates'
        options={{
          title: t('tabTemplates'),
          tabBarIcon: ({ color, size }) => <LayoutTemplate color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name='me'
        options={{
          title: t('tabMe'),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  )
}
