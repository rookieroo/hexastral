/**
 * Term glossary — curated for Xingqi LLM / VLM vocabulary (not the full 命理表).
 */

import type { Locale as TermLocale } from '@zhop/astro-i18n'
import { useTheme } from '@zhop/core-ui'
import { Stack } from 'expo-router'
import { useMemo } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { resolveLocale } from '@/lib/i18n'
import { isCjkZh, isZhHant, pickZh } from '@/lib/locale-zh'
import { getXingqiGlossaryGroups } from '@/lib/xingqi-terms'

function toTermLocale(locale: string): TermLocale {
  if (isZhHant(locale)) return 'zh-Hant'
  if (isCjkZh(locale)) return 'zh'
  if (locale.startsWith('ja')) return 'ja'
  return 'en'
}

export default function XingqiTermsScreen() {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const locale = resolveLocale()
  const s = (hans: string, hant: string, en: string) =>
    isCjkZh(locale) ? pickZh(locale, hans, hant) : en
  const groups = useMemo(() => getXingqiGlossaryGroups(toTermLocale(locale)), [locale])

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <Stack.Screen
        options={{
          headerShown: false,
          // Edge-only back — matches iOS system; full-screen swipe fights vertical scroll.
          gestureEnabled: true,
          fullScreenGestureEnabled: false,
        }}
      />
      <ScrollView
        contentContainerStyle={{
          padding: spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
          gap: spacing.lg,
        }}
        directionalLockEnabled
      >
        <Text style={{ fontFamily: 'CrimsonPro', color: colors.text, fontSize: 28 }}>
          {s('术语表', '術語表', 'Terms')}
        </Text>
        <Text style={{ color: colors.secondary, lineHeight: 22 }}>
          {s(
            '只收录形气报告里常见、且模型被引导使用的词：形气相术、五行气机、命盘对照、时间窗口。正文虚线可点按同一释义。',
            '只收錄形氣報告裡常見、且模型被引導使用的詞：形氣相術、五行氣機、命盤對照、時間窗口。正文虛線可點按同一釋義。',
            'Only terms the reading is steered to use: physiognomy, wuxing, natal contrast, time windows. Dotted prose opens the same glosses.'
          )}
        </Text>
        {groups.map((g) => (
          <View key={g.id} style={{ gap: spacing.sm }}>
            <Text
              style={{
                fontFamily: 'IBMPlexMono',
                color: colors.dim,
                fontSize: 11,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              }}
            >
              {isCjkZh(locale) ? g.labelZh : g.labelEn}
            </Text>
            {g.terms.map((t) => (
              <View key={t.id} style={{ gap: 4, marginBottom: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                  <Text style={{ color: colors.text, fontSize: 17, fontWeight: '500' }}>{t.zh}</Text>
                  {t.pinyin ? (
                    <Text
                      style={{
                        fontFamily: 'IBMPlexMono',
                        color: colors.dim,
                        fontSize: 12,
                      }}
                    >
                      {t.pinyin}
                    </Text>
                  ) : null}
                </View>
                <Text style={{ color: colors.accent, fontSize: 13 }}>{t.short}</Text>
                <Text style={{ color: colors.secondary, fontSize: 14, lineHeight: 20 }}>
                  {t.long}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  )
}
