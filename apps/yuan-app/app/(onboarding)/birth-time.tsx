/**
 * Onboarding · Screen 4 — Your birth time
 *
 * 12-cell 时辰 grid + "I don't know" skip. Backend uses 0..11 shichen
 * indexing (`birthTimeIndex`). Uses the shared `ShichenPicker` from core-ui
 * (Y4 extract) so the encoding stays consistent with hexastral-app and we
 * avoid the prior wall-clock → shichen rounding that silently produced an
 * out-of-range index 12 for hours 23:xx.
 */

import { type ShichenIndex, ShichenPicker } from '@zhop/core-ui'
import { yuanLight, yuanPresets, yuanSpacing, yuanType } from '@zhop/hexastral-tokens/yuan'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ProgressIndicator } from '@/components/ProgressIndicator'
import { resolveLocale, t } from '@/lib/i18n'
import { updateDraft, useDraft } from '@/lib/onboardingDraft'

export default function BirthTimeScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const draft = useDraft()
  const initial = draft.selfTimeIndex
  const [picked, setPicked] = useState<ShichenIndex | null>(
    typeof initial === 'number' && initial >= 0 && initial <= 11 ? (initial as ShichenIndex) : null
  )

  const handleNext = () => {
    if (picked === null) return
    Haptics.selectionAsync()
    updateDraft({ selfTimeIndex: picked })
    router.push('/(onboarding)/birth-place')
  }

  const handleSkip = () => {
    Haptics.selectionAsync()
    updateDraft({ selfTimeIndex: null })
    router.push('/(onboarding)/birth-place')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: yuanLight.bg }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: yuanSpacing.screenH,
          paddingTop: yuanSpacing.xl,
          paddingBottom: yuanSpacing.xxl,
        }}
      >
        <ProgressIndicator step={3} total={6} />
        <View style={{ height: yuanSpacing.xxl }} />
        <Text style={[yuanType.title, { color: yuanLight.text }]}>{t(locale, 'time.title')}</Text>
        <View style={{ height: yuanSpacing.xl }} />
        <ShichenPicker
          value={picked}
          onChange={setPicked}
          onSelect={() => Haptics.selectionAsync()}
          accentColor={yuanLight.accent}
        />
        <View style={{ flex: 1, minHeight: yuanSpacing.xl }} />
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Pressable onPress={handleSkip} hitSlop={12}>
            <Text
              style={[
                yuanType.caption,
                { color: yuanLight.textMuted, textDecorationLine: 'underline' },
              ]}
            >
              {t(locale, 'time.unknown')}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleNext}
            disabled={picked === null}
            hitSlop={12}
            style={{ opacity: picked === null ? 0.3 : 1 }}
          >
            <Text style={yuanPresets.ctaText}>{t(locale, 'common.next')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
