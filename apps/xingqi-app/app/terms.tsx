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
  const cjk = isCjkZh(locale)
  const s = (hans: string, hant: string, en: string) => (cjk ? pickZh(locale, hans, hant) : en)
  const groups = useMemo(() => getXingqiGlossaryGroups(toTermLocale(locale)), [locale])

  // CJK needs stronger title/body contrast + looser leading than Latin.
  const titleSize = cjk ? 26 : 28
  const introSize = cjk ? 14 : 15
  const termTitleSize = cjk ? 18 : 17
  const glossSize = cjk ? 15 : 14
  const glossLine = cjk ? 24 : 20
  const shortSize = cjk ? 12 : 13

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: true,
          fullScreenGestureEnabled: false,
        }}
      />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.lg,
          paddingBottom: insets.bottom + spacing.xl,
        }}
        directionalLockEnabled
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontFamily: 'CrimsonPro',
            color: colors.text,
            fontSize: titleSize,
            fontWeight: '600',
            marginBottom: spacing.sm,
          }}
        >
          {s('术语表', '術語表', 'Terms')}
        </Text>
        <Text
          style={{
            color: colors.secondary,
            fontSize: introSize,
            lineHeight: cjk ? 22 : 22,
            marginBottom: spacing.xl,
          }}
        >
          {s(
            '只收录形气报告里常见、且模型被引导使用的词：形气相术、五行气机、命盘对照、时间窗口。正文虚线可点按同一释义。',
            '只收錄形氣報告裡常見、且模型被引導使用的詞：形氣相術、五行氣機、命盤對照、時間窗口。正文虛線可點按同一釋義。',
            'Only terms the reading is steered to use: physiognomy, wuxing, natal contrast, time windows. Dotted prose opens the same glosses.'
          )}
        </Text>

        {groups.map((g, gi) => (
          <View
            key={g.id}
            style={{
              marginBottom: spacing.xl,
              marginTop: gi === 0 ? 0 : spacing.sm,
            }}
          >
            <Text
              style={{
                fontFamily: 'IBMPlexMono',
                color: colors.dim,
                fontSize: 11,
                letterSpacing: cjk ? 0.8 : 1.4,
                textTransform: 'uppercase',
                marginBottom: spacing.md,
              }}
            >
              {cjk ? g.labelZh : g.labelEn}
            </Text>

            <View style={{ borderTopWidth: 0.5, borderTopColor: colors.separator }}>
              {g.terms.map((t) => (
                <View
                  key={t.id}
                  style={{
                    paddingVertical: spacing.md,
                    borderBottomWidth: 0.5,
                    borderBottomColor: colors.separator,
                    gap: spacing.xs,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: termTitleSize,
                        fontWeight: '600',
                        lineHeight: termTitleSize + 4,
                      }}
                    >
                      {t.zh}
                    </Text>
                    {t.pinyin ? (
                      <Text
                        style={{
                          fontFamily: 'IBMPlexMono',
                          color: colors.dim,
                          fontSize: 11,
                          letterSpacing: 0.4,
                        }}
                      >
                        {t.pinyin}
                      </Text>
                    ) : null}
                  </View>
                  {t.short ? (
                    <Text
                      style={{
                        color: colors.accent,
                        fontSize: shortSize,
                        lineHeight: shortSize + 4,
                        marginTop: 2,
                      }}
                    >
                      {t.short}
                    </Text>
                  ) : null}
                  <Text
                    style={{
                      color: colors.secondary,
                      fontSize: glossSize,
                      lineHeight: glossLine,
                      marginTop: t.short ? spacing.xs : 2,
                    }}
                  >
                    {t.long}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}
