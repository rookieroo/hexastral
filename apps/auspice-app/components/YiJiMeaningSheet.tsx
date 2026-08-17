/**
 * YiJiMeaningSheet — 黄历行话释义弹层（免费、确定性）.
 *
 * 释义来源：宜忌动词走维基百科「择日宜忌」+ 补充词条（yiji-meanings）；
 * Hero 专有名词（岁次/干支/建除/值神/星宿/冲煞/彭祖百忌/纳音/五行/
 * 生肖/农历）走 hero-terms（四语）。点击任意行话弹出。
 */

import { useTheme } from '@zhop/core-ui'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { almanacPalette } from '@/lib/almanac-palette'
import { useAlmanacTheme } from '@/lib/almanac-theme-context'
import { useStrings } from '@/lib/i18n-context'

export function YiJiMeaningSheet({
  term,
  detail,
  meaning,
  emptyText,
  footnote,
  onClose,
}: {
  term: string | null
  /** 当日具体值解释（如「今日值『闭』：…」）；null 时跳过。 */
  detail?: string | null
  /** 统称解释（术语是什么）；null 时显示无词条。 */
  meaning: string | null
  /** 无词条提示（四语）。 */
  emptyText?: string
  /** 落款（四语）。 */
  footnote?: string
  onClose: () => void
}) {
  const { isDark, spacing } = useTheme()
  const { theme } = useAlmanacTheme()
  const { locale } = useStrings()
  const P = almanacPalette(isDark, theme, new Date().getDay(), locale)

  return (
    <Modal visible={term != null} transparent animationType='fade' onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(20,14,8,0.45)' }}
        onPress={onClose}
        accessibilityRole='button'
        accessibilityLabel='关闭释义'
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: P.card }}>
            <View
              style={{
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                borderTopWidth: 0.5,
                borderTopColor: P.line,
                paddingHorizontal: spacing.xl,
                paddingTop: spacing.lg,
                paddingBottom: spacing['2xl'],
                gap: spacing.md,
              }}
            >
              <View style={{ alignItems: 'center' }}>
                <View
                  style={{
                    width: 36,
                    height: 3.5,
                    borderRadius: 2,
                    backgroundColor: P.line,
                  }}
                />
              </View>
              <Text
                style={{
                  color: P.gold,
                  fontSize: 20,
                  fontWeight: '700',
                  letterSpacing: 3,
                  textAlign: 'center',
                }}
              >
                {term ?? ''}
              </Text>
              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                {detail ? (
                  <View style={{ gap: 4 }}>
                    <Text style={{ color: P.gold, fontSize: 11, letterSpacing: 2 }}>今日</Text>
                    <Text style={{ color: P.ink, fontSize: 15, lineHeight: 25 }}>{detail}</Text>
                    <View style={{ height: 0.5, backgroundColor: P.line, marginVertical: 8 }} />
                  </View>
                ) : null}
                {meaning ? (
                  <View style={{ gap: 4 }}>
                    <Text style={{ color: P.gold, fontSize: 11, letterSpacing: 2 }}>通释</Text>
                    <Text style={{ color: P.ink, fontSize: 15, lineHeight: 25 }}>{meaning}</Text>
                  </View>
                ) : null}
                {!detail && !meaning ? (
                  <Text style={{ color: P.dim, fontSize: 14, lineHeight: 22 }}>
                    {emptyText ?? '此词暂无释义收录。'}
                  </Text>
                ) : null}
              </ScrollView>
              <Text
                style={{
                  color: P.dim,
                  fontSize: 11,
                  textAlign: 'center',
                  letterSpacing: 1,
                }}
              >
                {footnote ?? '释义据《通书》与维基百科「黄历」条目整理 · 文化参考'}
              </Text>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  )
}
