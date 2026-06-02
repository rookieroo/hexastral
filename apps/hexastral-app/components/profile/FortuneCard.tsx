/**
 * 运 — Fortune 卡片
 *
 * 订阅状态 + 语气偏好 (gentle / straight / poetic)
 */

import { useRouter } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { Pressable, Text, View } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { useIosPalette } from '@/lib/theme'
import { ProfileCard, SectionLabel } from './ProfileRow'

type TonePreference = 'gentle' | 'straight' | 'poetic'

interface FortuneCardProps {
  isSubscribed: boolean
  tonePreference: TonePreference
  onTonePreferenceChange: (next: TonePreference) => void
}

export function FortuneCard({
  isSubscribed,
  tonePreference,
  onTonePreferenceChange,
}: FortuneCardProps) {
  const router = useRouter()
  const ios = useIosPalette()
  const { t } = useI18n()

  return (
    <>
      <SectionLabel glyph='运' title='FORTUNE' />
      <ProfileCard>
        {/* Subscription status / upgrade CTA */}
        {isSubscribed ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 14,
              borderBottomWidth: 0.5,
              borderBottomColor: ios.separator,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '300', color: ios.text, flex: 1 }}>
              HexAstral Pro
            </Text>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '500',
                color: ios.accent,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              PRO
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={() => router.push('/paywall')}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <View
              style={{
                backgroundColor: ios.tint,
                paddingVertical: 16,
                paddingHorizontal: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '500',
                    color: ios.tintFg,
                    letterSpacing: 0.3,
                  }}
                >
                  {t('profile_upgrade')}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '300',
                    color: `${ios.tintFg}99`,
                    marginTop: 2,
                  }}
                >
                  {t('profile_upgrade_sub')}
                </Text>
              </View>
              <ChevronRight size={14} color={`${ios.tintFg}99`} />
            </View>
          </Pressable>
        )}

        {/* Tone preference */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 14 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '400',
              color: ios.secondary,
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            {t('tone_preference_label')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['gentle', 'straight', 'poetic'] as const).map((option) => {
              const selected = tonePreference === option
              return (
                <Pressable
                  key={option}
                  onPress={() => onTonePreferenceChange(option)}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 8,
                    alignItems: 'center',
                    backgroundColor: selected ? ios.tint : 'transparent',
                    borderWidth: 0.5,
                    borderColor: selected ? ios.tint : ios.separator,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: selected ? '500' : '300',
                      color: selected ? ios.tintFg : ios.secondary,
                    }}
                  >
                    {t(`tone_${option}_label` as const)}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      </ProfileCard>
    </>
  )
}
