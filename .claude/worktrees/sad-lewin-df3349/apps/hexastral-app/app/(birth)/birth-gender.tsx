/**
 * Birth onboarding · Step 3 — Gender
 *
 * Required by `apps/hexastral-api/src/routes/onboarding.ts` /bootstrap
 * validation (`birthGender`). Two large buttons; tap-to-advance after
 * selection (no separate Next CTA — the choice IS the action).
 */

import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ProgressIndicator } from '@/components/onboarding/ProgressIndicator'
import { updateBirthDraft, useBirthDraft } from '@/lib/birthDraft'
import { useI18n } from '@/lib/i18n'
import { useIosPalette } from '@/lib/theme'

export default function BirthGenderScreen() {
  const router = useRouter()
  const { t } = useI18n()
  const ios = useIosPalette()
  const draft = useBirthDraft()

  const select = (g: '男' | '女') => {
    Haptics.selectionAsync()
    updateBirthDraft({ gender: g })
    router.push('/birth-place')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ios.bg }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 24 }}>
        <ProgressIndicator step={3} total={5} />
        <View style={{ height: 28 }} />
        <Text style={{ color: ios.text, fontSize: 26, fontWeight: '500', letterSpacing: 0.4 }}>
          {t('birth_conv_gender_title')}
        </Text>
        <View style={{ height: 8 }} />
        <Text style={{ color: ios.secondary, fontSize: 13, fontWeight: '300' }}>
          {t('birth_conv_gender_subtitle')}
        </Text>

        <View style={{ flex: 1 }} />

        <View style={{ flexDirection: 'row', gap: 16 }}>
          {(['男', '女'] as const).map((g) => {
            const active = draft.gender === g
            return (
              <Pressable
                key={g}
                onPress={() => select(g)}
                style={{
                  flex: 1,
                  paddingVertical: 32,
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
                    fontSize: 32,
                    fontWeight: '500',
                  }}
                >
                  {g}
                </Text>
                <Text
                  style={{
                    color: active ? ios.bg : ios.secondary,
                    fontSize: 11,
                    fontWeight: '300',
                    letterSpacing: 1.4,
                    marginTop: 6,
                  }}
                >
                  {g === '男' ? t('birth_conv_gender_male') : t('birth_conv_gender_female')}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <View style={{ height: 64 }} />
      </View>
    </SafeAreaView>
  )
}
