/**
 * Onboarding · Screen 1 — Welcome
 *
 * Single character 緣 with slow breathing animation. Tap anywhere to continue.
 * Sets the brand tone before any form input.
 */

import { useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { YuanSeal } from '@zhop/scenario-yuan'
import { yuanLight, yuanType, yuanSpacing } from '@zhop/hexastral-tokens/yuan'
import { resolveLocale, t } from '@/lib/i18n'

export default function WelcomeScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])

  return (
    <Pressable
      onPress={() => router.push('/(onboarding)/name')}
      style={{ flex: 1, backgroundColor: yuanLight.bg }}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <YuanSeal mode="breathing" size={120} />
        <View style={{ height: yuanSpacing.xl }} />
        <Text style={[yuanType.title, { color: yuanLight.text, textAlign: 'center' }]}>
          {t(locale, 'welcome.line1')}
        </Text>
        <Text
          style={[
            yuanType.title,
            { color: yuanLight.text, textAlign: 'center', marginTop: yuanSpacing.sm },
          ]}
        >
          {t(locale, 'welcome.line2')}
        </Text>
      </View>
      <View style={{ paddingBottom: 80, alignItems: 'center' }}>
        <Text style={[yuanType.caption, { color: yuanLight.accent }]}>
          {t(locale, 'welcome.tap')}
        </Text>
      </View>
    </Pressable>
  )
}
