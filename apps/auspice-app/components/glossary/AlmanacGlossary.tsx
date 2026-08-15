/**
 * AlmanacGlossary — 黄历行话 category in the culture hub (/glossary).
 *
 * The orthodox 通书 register, education-first: 建除十二神 / 黄黑道十二值神 /
 * 二十八宿 / 十二时辰文言名 / 彭祖百忌 / 纳音. Pure reference tables from
 * astro-core + classical-glossary — no day-specific data, no LLM.
 *
 * Moved here from the home page (2026-08): the 历书 belongs to the culture hub,
 * not inline on Today. Home keeps only the Today content; browsing the full
 * register is a deliberate culture visit.
 */

import { TWELVE_OFFICERS, TWENTY_EIGHT_MANSIONS } from '@zhop/astro-core'
import { useTheme } from '@zhop/core-ui'
import { Text, View } from 'react-native'
import {
  dayGodEntry,
  nayinIntro,
  officerEntry,
  pengzuIntro,
  shichenClassicalName,
} from '@/lib/culture/classical-glossary'
import { toHant, YIJI_MEANING_GROUPS, yijiMeaning } from '@/lib/culture/yiji-meanings'
import type { Locale } from '@/lib/i18n'

const QUADRANT_LABEL: Record<string, string> = {
  青龙: '东方青龙',
  玄武: '北方玄武',
  白虎: '西方白虎',
  朱雀: '南方朱雀',
}

const DAY_GODS = [
  '青龙',
  '明堂',
  '天刑',
  '朱雀',
  '金匮',
  '天德',
  '白虎',
  '玉堂',
  '天牢',
  '玄武',
  '司命',
  '勾陈',
] as const

export function AlmanacGlossary({ locale }: { locale: Locale }) {
  const { colors, spacing } = useTheme()
  const micro = { color: colors.dim, fontSize: 11, letterSpacing: 2 } as const
  const row = { color: colors.secondary, fontSize: 13, lineHeight: 20 } as const

  return (
    <View style={{ gap: spacing.lg }}>
      {/* 彭祖百忌 / 纳音 — two classic glosses, plain language first. */}
      <View style={{ gap: spacing.sm }}>
        <Text style={micro}>彭祖百忌</Text>
        <Text style={{ color: colors.text, fontSize: 14, lineHeight: 22 }}>
          {pengzuIntro(locale)}
        </Text>
        <Text style={micro}>纳音</Text>
        <Text style={{ color: colors.text, fontSize: 14, lineHeight: 22 }}>
          {nayinIntro(locale)}
        </Text>
      </View>

      <View style={{ gap: 4 }}>
        <Text style={micro}>建除十二神</Text>
        {TWELVE_OFFICERS.map((o) => {
          const e = officerEntry(o, locale)
          return e ? (
            <Text key={o} style={row}>
              {o} · {e.baihua}
            </Text>
          ) : null
        })}
      </View>

      <View style={{ gap: 4 }}>
        <Text style={micro}>黄黑道十二值神</Text>
        {DAY_GODS.map((n) => {
          const e = dayGodEntry(n, locale)
          return e ? (
            <Text key={n} style={row}>
              {n}（{e.dao}）· {e.baihua}
            </Text>
          ) : null
        })}
      </View>

      <View style={{ gap: 4 }}>
        <Text style={micro}>二十八宿</Text>
        {TWENTY_EIGHT_MANSIONS.map((m) => (
          <Text key={m.name} style={row}>
            {m.name}
            {m.luminary}
            {m.animal} · {QUADRANT_LABEL[m.quadrant] ?? m.quadrant}
          </Text>
        ))}
      </View>

      <View style={{ gap: 4 }}>
        <Text style={micro}>十二时辰</Text>
        <Text style={row}>
          {Array.from({ length: 12 }, (_, i) => shichenClassicalName(i, locale)).join(' · ')}
        </Text>
      </View>

      {/* 择日宜忌释义 — 维基百科「黄历」条目 + 常用动词补充（四语：
          原文 + 拼音/读音 + 一句话白话解释）。 */}
      <View style={{ gap: spacing.md }}>
        {YIJI_MEANING_GROUPS.map((g) => (
          <View key={g.title} style={{ gap: 6 }}>
            <Text style={micro}>{g.title}</Text>
            {g.terms.map((term) => {
              const meaning = yijiMeaning(term, locale)
              return meaning ? (
                <View key={term} style={{ gap: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                    {locale === 'zh-Hant' ? toHant(term) : term}
                  </Text>
                  <Text style={{ color: colors.secondary, fontSize: 12, lineHeight: 18 }}>
                    {meaning}
                  </Text>
                </View>
              ) : null
            })}
          </View>
        ))}
      </View>
    </View>
  )
}
