/**
 * Birth onboarding · Step 2 — Time (shichen)
 *
 * 12-cell shichen grid with branch glyphs + a "skip" affordance.
 * Stores 0..11 (skip = null) — matches existing hexastral-api timeIndex
 * convention (`birthTimeIndex`).
 */

import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ProgressIndicator } from '@/components/onboarding/ProgressIndicator'
import { updateBirthDraft, useBirthDraft } from '@/lib/birthDraft'
import { useI18n } from '@/lib/i18n'
import { useIosPalette } from '@/lib/theme'

const SHICHEN = [
  { index: 0, branch: '子', range: '23:00 – 01:00' },
  { index: 1, branch: '丑', range: '01:00 – 03:00' },
  { index: 2, branch: '寅', range: '03:00 – 05:00' },
  { index: 3, branch: '卯', range: '05:00 – 07:00' },
  { index: 4, branch: '辰', range: '07:00 – 09:00' },
  { index: 5, branch: '巳', range: '09:00 – 11:00' },
  { index: 6, branch: '午', range: '11:00 – 13:00' },
  { index: 7, branch: '未', range: '13:00 – 15:00' },
  { index: 8, branch: '申', range: '15:00 – 17:00' },
  { index: 9, branch: '酉', range: '17:00 – 19:00' },
  { index: 10, branch: '戌', range: '19:00 – 21:00' },
  { index: 11, branch: '亥', range: '21:00 – 23:00' },
] as const

export default function BirthTimeScreen() {
  const router = useRouter()
  const { t } = useI18n()
  const ios = useIosPalette()
  const draft = useBirthDraft()
  const [picked, setPicked] = useState<number | null>(draft.timeIndex)

  const handleNext = () => {
    Haptics.selectionAsync()
    updateBirthDraft({ timeIndex: picked })
    router.push('/birth-gender')
  }

  const handleSkip = () => {
    Haptics.selectionAsync()
    updateBirthDraft({ timeIndex: null })
    router.push('/birth-gender')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ios.bg }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 }}
      >
        <ProgressIndicator step={2} total={5} />
        <View style={{ height: 28 }} />
        <Text style={{ color: ios.text, fontSize: 26, fontWeight: '500', letterSpacing: 0.4 }}>
          {t('birth_conv_time_title')}
        </Text>
        <View style={{ height: 8 }} />
        <Text style={{ color: ios.secondary, fontSize: 13, fontWeight: '300' }}>
          {t('birth_conv_time_subtitle')}
        </Text>
        <View style={{ height: 24 }} />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {SHICHEN.map((s) => {
            const active = picked === s.index
            return (
              <Pressable
                key={s.index}
                onPress={() => {
                  Haptics.selectionAsync()
                  setPicked(s.index)
                }}
                style={{
                  width: '30%',
                  paddingVertical: 14,
                  alignItems: 'center',
                  borderWidth: 0.5,
                  borderColor: active ? ios.text : ios.separator,
                  backgroundColor: active ? ios.text : 'transparent',
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={{
                    color: active ? ios.bg : ios.text,
                    fontSize: 22,
                    fontWeight: '500',
                  }}
                >
                  {s.branch}
                </Text>
                <Text
                  style={{
                    color: active ? ios.bg : ios.secondary,
                    fontSize: 10,
                    fontWeight: '300',
                    marginTop: 2,
                  }}
                >
                  {s.range}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <View style={{ flex: 1, minHeight: 24 }} />

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 8,
          }}
        >
          <Pressable onPress={handleSkip} hitSlop={12}>
            <Text
              style={{
                color: ios.secondary,
                fontSize: 13,
                fontWeight: '300',
                textDecorationLine: 'underline',
              }}
            >
              {t('birth_conv_time_skip')}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleNext}
            disabled={picked === null}
            hitSlop={12}
            style={{ paddingVertical: 12, opacity: picked === null ? 0.3 : 1 }}
          >
            <Text
              style={{
                color: ios.text,
                fontSize: 14,
                fontWeight: '500',
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              }}
            >
              {t('birth_conv_next')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
