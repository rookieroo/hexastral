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
import { isCjkZh, isJa, isZhHant, pickUi } from '@/lib/locale-zh'
import { getXingqiGlossaryGroups, toZhHant } from '@/lib/xingqi-terms'

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
  const ja = isJa(locale)
  const s = (hans: string, hant: string, en: string, jaStr?: string) =>
    pickUi(locale, hans, hant, en, jaStr)
  const groups = useMemo(() => getXingqiGlossaryGroups(toTermLocale(locale)), [locale])

  const titleSize = cjk || ja ? 26 : 28
  const introSize = cjk || ja ? 14 : 15
  const termTitleSize = cjk || ja ? 18 : 17
  const glossSize = cjk || ja ? 15 : 14
  const glossLine = cjk || ja ? 24 : 20
  const shortSize = cjk || ja ? 12 : 13

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
          {s('术语表', '術語表', 'Terms', '用語集')}
        </Text>
        <Text
          style={{
            color: colors.secondary,
            fontSize: introSize,
            lineHeight: cjk || ja ? 22 : 22,
            marginBottom: spacing.xl,
          }}
        >
          {s(
            '按所用学说分桶收录：面相（三停五岳十二宫）、掌相（主纹丘位）、命盘对照、中医词典层（气血/敛浮阳等「象」）、时间窗口。正文与位点 sheet 虚线可点按同一释义。',
            '按所用學說分桶收錄：面相（三停五岳十二宮）、掌相（主紋丘位）、命盤對照、中醫詞典層（氣血/斂浮陽等「象」）、時間窗口。正文與位點 sheet 虛線可點按同一釋義。',
            'Grouped by doctrine in use: face form (面相), palm form (掌相), BaZi cross-reference, TCM-as-lexicon (qi–blood / floating yang…), time windows. Dotted prose and locus sheets open the same glosses.',
            '使用する学説ごとに分類：面相（三停・五岳・十二宮）、掌相（主線・丘位）、命式対照、中医辞書層（気血／斂浮陽などの「象」）、時間の窓。本文と部位シートの点線は同じ解説を開きます。'
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
              {cjk ? g.labelZh : ja ? g.labelJa : g.labelEn}
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
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'baseline',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: termTitleSize,
                        fontWeight: '600',
                        lineHeight: termTitleSize + 4,
                      }}
                    >
                      {isZhHant(locale) ? toZhHant(t.zh) : t.zh}
                    </Text>
                    {t.pinyin && !ja ? (
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
