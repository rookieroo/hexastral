/**
 * Onboarding · Screen 6 — Other person, choose mode
 *
 * Two paths:
 *   "Invite them" → /(onboarding)/invite-email → mailer sends link → waiting state
 *   "I'll fill in" → /(onboarding)/fill-other → both birth datas → reveal
 */

import { ink } from '@zhop/hexastral-tokens'
import { yuanLight, yuanSpacing, yuanType } from '@zhop/hexastral-tokens/yuan'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Circle, Svg } from 'react-native-svg'
import { ProgressIndicator } from '@/components/ProgressIndicator'
import { resolveLocale, t } from '@/lib/i18n'
import { updateDraft } from '@/lib/onboardingDraft'

function OverlappingCircles({ size = 100 }: { size?: number }) {
  const r = size * 0.32
  const offset = r * 0.7
  return (
    <Svg width={size} height={size * 0.7}>
      <Circle
        cx={size / 2 - offset}
        cy={size * 0.35}
        r={r}
        stroke={ink.gold}
        strokeWidth={1.2}
        fill='none'
      />
      <Circle
        cx={size / 2 + offset}
        cy={size * 0.35}
        r={r}
        stroke={ink.gold}
        strokeWidth={1.2}
        fill='none'
      />
    </Svg>
  )
}

export default function ModeScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: yuanLight.bg }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: yuanSpacing.screenH,
          paddingTop: yuanSpacing.xl,
        }}
      >
        <ProgressIndicator step={5} total={6} />

        <View
          style={{ alignItems: 'center', marginTop: yuanSpacing.xxl, marginBottom: yuanSpacing.xl }}
        >
          <OverlappingCircles size={140} />
        </View>

        <Text style={[yuanType.title, { color: yuanLight.text }]}>{t(locale, 'mode.title')}</Text>

        <View style={{ height: yuanSpacing.xl }} />

        <Pressable
          onPress={() => {
            updateDraft({ otherMode: 'invite' })
            router.push('/(onboarding)/invite-email')
          }}
          style={{
            paddingVertical: yuanSpacing.lg,
            paddingHorizontal: yuanSpacing.lg,
            borderWidth: 0.5,
            borderColor: yuanLight.border,
            gap: 4,
          }}
        >
          <Text style={[yuanType.heading, { color: yuanLight.text }]}>
            {t(locale, 'mode.invite')}
          </Text>
          <Text style={[yuanType.caption, { color: yuanLight.textSecondary }]}>
            {t(locale, 'mode.inviteHint')}
          </Text>
        </Pressable>

        <View style={{ flex: 1 }} />

        <Pressable
          onPress={() => {
            updateDraft({ otherMode: 'fill' })
            router.push('/(onboarding)/fill-other')
          }}
          hitSlop={12}
          style={{ alignSelf: 'flex-end' }}
        >
          <Text
            style={[yuanType.caption, { color: yuanLight.accent, textDecorationLine: 'underline' }]}
          >
            {t(locale, 'mode.fill')}
          </Text>
        </Pressable>
        <View style={{ height: yuanSpacing.xxl }} />
      </View>
    </SafeAreaView>
  )
}
