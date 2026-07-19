/**
 * Deterministic natal strip for Xingqi result — proves BaZi was computed into the reading.
 */

import { Text, View } from 'react-native'

import { isCjkZh, isZhHant, pickZh } from '@/lib/locale-zh'

export type NatalFacts = {
  dayPillar?: string
  dayMaster?: string
  dayun?: string
  dayunYears?: string
  liuNian?: string
  nextLiuNian?: string
}

export function natalFactsFromOutput(output: Record<string, unknown>): NatalFacts | null {
  const raw = output.natalFacts
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const pick = (k: string) => (typeof o[k] === 'string' ? (o[k] as string).trim() : '')
  const facts: NatalFacts = {
    dayPillar: pick('dayPillar'),
    dayMaster: pick('dayMaster'),
    dayun: pick('dayun'),
    dayunYears: pick('dayunYears'),
    liuNian: pick('liuNian'),
    nextLiuNian: pick('nextLiuNian'),
  }
  if (!facts.dayPillar && !facts.dayun && !facts.liuNian) return null
  return facts
}

export function NatalFactsStrip({
  facts,
  locale,
  colors,
}: {
  facts: NatalFacts
  locale: string
  colors: { text: string; secondary: string; dim: string; accent: string; separator: string }
}) {
  const label = (hans: string, hant: string, en: string) =>
    isCjkZh(locale) ? pickZh(locale, hans, hant) : en

  const rows: Array<{ k: string; v: string }> = []
  if (facts.dayPillar) {
    rows.push({
      k: label('日柱', '日柱', 'Day pillar'),
      v: facts.dayPillar,
    })
  }
  if (facts.dayun) {
    rows.push({
      k: label('当前大运', '目前大運', 'Current DaYun'),
      v: facts.dayunYears ? `${facts.dayun} · ${facts.dayunYears}` : facts.dayun,
    })
  }
  if (facts.liuNian) {
    rows.push({
      k: label('流年', '流年', 'LiuNian'),
      v: facts.liuNian,
    })
  }
  if (facts.nextLiuNian) {
    rows.push({
      k: label('次年', '次年', 'Next year'),
      v: facts.nextLiuNian,
    })
  }
  if (rows.length === 0) return null

  const title = isZhHant(locale)
    ? '本命氣機（算入報告）'
    : isCjkZh(locale)
      ? '本命气机（算入报告）'
      : 'Natal qi (computed into this reading)'

  return (
    <View
      style={{
        marginTop: 8,
        paddingTop: 14,
        borderTopWidth: 0.5,
        borderTopColor: colors.separator,
        gap: 8,
      }}
    >
      <Text
        style={{
          fontFamily: 'IBMPlexMono',
          color: colors.accent,
          fontSize: 11,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Text>
      {rows.map((r) => (
        <View
          key={r.k}
          style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}
        >
          <Text style={{ color: colors.dim, fontSize: 13 }}>{r.k}</Text>
          <Text
            style={{
              color: colors.text,
              fontSize: 14,
              fontFamily: 'IBMPlexMono',
              flexShrink: 1,
              textAlign: 'right',
            }}
          >
            {r.v}
          </Text>
        </View>
      ))}
    </View>
  )
}
