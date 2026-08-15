/**
 * AlmanacPage — 黄历模式首页（四语版，2026-08）.
 *
 * zh-Hans/zh-Hant：撕页黄历原文（竖排行话、文言判语）；
 * ja：撕页黄历白话（日文可竖排，术语用日文释义）；
 * en：横排白话黄历（拉丁字不竖排）——对 en/ja，「黄历模式」=
 * 黄历布局 + 白话术语，文言内容仍 zh-only。
 * 行话全部可点解释（hero-terms 四语）；宜忌动词 en/ja 走本地化词表，
 * 释义层 zh 88 条 + hero 11 词四语。赭金/墨棕，light/dark。
 */

import {
  BRANCH_ZODIAC,
  branchRelationSummary,
  type EarthlyBranch,
  formatYijiVerb,
  STEM_WUXING,
} from '@zhop/astro-core'
import { useTheme } from '@zhop/core-ui'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, type TextStyle, View } from 'react-native'
import { YiJiMeaningSheet } from '@/components/YiJiMeaningSheet'
import { almanacCopy } from '@/lib/almanac-copy'
import type { AuspiceDayPayload } from '@/lib/api'
import { localizeSolarTermName } from '@/lib/culture'
import { dayGodEntry, officerEntry } from '@/lib/culture/classical-glossary'
import { heroTermExplanation } from '@/lib/culture/hero-terms'
import { toHant, yijiMeaning } from '@/lib/culture/yiji-meanings'
import {
  caishenDirection,
  hourGod,
  isYangGongDay,
  monthPillar,
  nayinOf,
  xishenDirection,
} from '@/lib/huangli-day'
import type { Locale } from '@/lib/i18n'
import { useStrings } from '@/lib/i18n-context'
import { resolveRegisterSync } from '@/lib/yiji-display-mode'

export function almanacPalette(isDark: boolean) {
  return isDark
    ? {
        bg: '#171310',
        card: '#221b15',
        ink: '#e9ddc8',
        dim: '#9c8d78',
        line: '#3c3329',
        gold: '#d9b36a',
        brown: '#cdbba7',
        goldSoft: 'rgba(217,179,106,0.14)',
      }
    : {
        bg: '#f6f1e6',
        card: '#fffdf7',
        ink: '#2b2118',
        dim: '#8a7f70',
        line: '#e3d9c6',
        gold: '#9a6b1f',
        brown: '#4a3324',
        goldSoft: '#f1e6cf',
      }
}
type Palette = ReturnType<typeof almanacPalette>

export function AlmanacPage({ payload, locale }: { payload: AuspiceDayPayload; locale: Locale }) {
  const { spacing, isDark } = useTheme()
  const { t } = useStrings()
  const P = almanacPalette(isDark)
  const C = almanacCopy(locale)
  // 动词注册表：zh 黄历模式→原文；en→modern；ja→白话 gloss。
  const register = resolveRegisterSync(locale, true)
  const verb = (v: string) => formatYijiVerb(v, locale, register)

  const { date, day } = payload
  const [meaningTerm, setMeaningTerm] = useState<string | null>(null)

  const d = new Date(`${date}T00:00:00`)
  const yg = day.yearGanZhi
  const dayBranch = day.ganZhi[1] ?? ''
  const monthP = yg ? monthPillar(yg.stem, day.solarTerm.prev.name) : null
  const hourPillar = day.hours[0]?.ganZhi ?? ''
  const nayin = nayinOf(day.ganZhi)

  const pillars: Array<{ label: string; ganzhi: string; nayin: string }> = [
    {
      label: locale === 'en' ? 'Year' : locale === 'ja' ? '年柱' : '年柱',
      ganzhi: yg ? `${yg.stem}${yg.branch}` : '',
      nayin: yg ? nayinOf(`${yg.stem}${yg.branch}`) : '',
    },
    {
      label: locale === 'en' ? 'Month' : '月柱',
      ganzhi: monthP ?? '',
      nayin: monthP ? nayinOf(monthP) : '',
    },
    { label: locale === 'en' ? 'Day' : '日柱', ganzhi: day.ganZhi, nayin: nayin },
    {
      label: locale === 'en' ? 'Hour' : '时柱',
      ganzhi: hourPillar,
      nayin: hourPillar ? nayinOf(hourPillar) : '',
    },
  ]

  const yangGong = day.lunarDate ? isYangGongDay(day.lunarDate.month, day.lunarDate.day) : false
  const officer = officerEntry(day.dayOfficer, locale)
  const god = day.dayGod?.name ? dayGodEntry(day.dayGod.name, locale) : null

  const rows: Array<[string, string, string | null, string | null]> = [
    ['五行', C.nayinLine(nayin), null, '五行'],
    ['冲煞', day.clash ? C.clashText(day.clash.clashAnimal, day.evilDirection) : '—', null, '冲煞'],
    ['值神', day.dayGod?.name ?? '—', god?.baihua ?? null, '值神'],
    ['建除', `${day.dayOfficer}${C.officerDaySuffix}`, officer?.baihua ?? null, '建除'],
    ['彭祖', day.pengZu ? C.pengzuText(day.pengZu.stem, day.pengZu.branch) : '—', null, '彭祖百忌'],
    [
      '星宿',
      day.mansion ? `${day.mansion.name}${day.mansion.luminary}${day.mansion.animal}宿` : '—',
      day.mansion ? C.quadrant(day.mansion) : null,
      '星宿',
    ],
  ]
  const rowLabel = (label: string) =>
    ({
      五行: C.rowElement,
      冲煞: C.rowClash,
      值神: C.rowDayGod,
      建除: C.rowOfficer,
      彭祖: C.rowPengZu,
      星宿: C.rowMansion,
    })[label] ?? label

  const relationLine = C.relationSentence(dayBranch)

  const fit = payload.personalization?.fit ?? null
  const sheetMeaning = meaningTerm
    ? (yijiMeaning(meaningTerm, locale) ?? heroTermExplanation(meaningTerm, locale))
    : null
  const tap = (term: string) => setMeaningTerm(term)

  /** 当日具体值解释（「今日」行，四语）。 */
  const explainDetail = (term: string): string | null => {
    switch (term) {
      case '干支':
        return locale === 'en'
          ? `${day.ganZhi} day: stem ${day.ganZhi[0]} is ${STEM_WUXING[day.ganZhi[0] as keyof typeof STEM_WUXING] ?? ''}; branch ${dayBranch} is the ${C.animal(dayBranch)}.`
          : locale === 'ja'
            ? `${day.ganZhi}日：${day.ganZhi[0]}は${STEM_WUXING[day.ganZhi[0] as keyof typeof STEM_WUXING] ?? ''}、${dayBranch}は${C.animal(dayBranch)}。`
            : `${day.ganZhi}日：${day.ganZhi[0]}属${STEM_WUXING[day.ganZhi[0] as keyof typeof STEM_WUXING] ?? ''}；${dayBranch}为${C.animal(dayBranch)}。`
      case '建除':
        return `${C.rowOfficer}「${day.dayOfficer}」：${officer?.baihua ?? ''}`
      case '值神':
        return god ? `${C.rowDayGod}「${day.dayGod?.name}」：${god.baihua}（${god.dao}）` : null
      case '星宿':
        return day.mansion
          ? `${C.rowMansion}「${day.mansion.name}${day.mansion.luminary}${day.mansion.animal}」：${C.quadrant(day.mansion)}。`
          : null
      case '农历':
        return day.lunarDate ? C.lunarLine(day.lunarDate) : null
      case '岁次':
        return yg ? C.yearLine(yg.stem, yg.branch, yg.animal) : null
      case '纳音':
        return C.nayinLine(nayin)
      case '冲煞':
        return day.clash ? C.clashText(day.clash.clashAnimal, day.evilDirection) : null
      case '彭祖百忌':
        return day.pengZu ? C.pengzuText(day.pengZu.stem, day.pengZu.branch) : null
      case '五行':
        return C.nayinLine(nayin)
      default:
        return null
    }
  }

  const goodFor = day.goodFor.map(verb)
  const avoid = day.avoid.map(verb)

  return (
    <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
      {/* ══ 撕页黄历纸页 ══ */}
      <View style={{ borderWidth: 2, borderColor: P.ink, padding: 3 }}>
        <View
          style={{
            borderWidth: 0.5,
            borderColor: P.ink,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <Text style={{ color: P.ink, fontSize: 14, letterSpacing: 1 }}>{C.gregorian(d)}</Text>
            <Text style={{ color: P.dim, fontSize: 12, letterSpacing: 2 }}>{C.weekday(d)}</Text>
          </View>

          {C.vertical ? (
            /* CJK 竖排条 */
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: spacing.md,
              }}
            >
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Strip
                  text={`${day.ganZhi}${C.ganZhiSuffix}`}
                  term='干支'
                  onPress={tap}
                  style={vStyle(P)}
                />
                <Strip
                  text={`${day.dayOfficer}${C.officerDaySuffix}`}
                  term='建除'
                  onPress={tap}
                  style={vStyle(P)}
                />
                <Strip
                  text={day.dayGod?.name ? `${C.dayGodPrefix}${day.dayGod.name}` : ''}
                  term='值神'
                  onPress={tap}
                  style={vStyle(P)}
                />
                <Strip
                  text={
                    day.mansion
                      ? `${C.stripMansion}${day.mansion.name}${day.mansion.luminary}${day.mansion.animal}宿`
                      : ''
                  }
                  term='星宿'
                  onPress={tap}
                  style={vStyle(P)}
                />
              </View>

              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text
                  style={{
                    color: P.ink,
                    fontSize: 92,
                    lineHeight: 104,
                    fontWeight: '700',
                    letterSpacing: 2,
                  }}
                >
                  {d.getDate()}
                </Text>
                <Pressable onPress={() => tap('纳音')} hitSlop={6}>
                  {day.solarTermToday ? (
                    <Text style={{ color: P.gold, fontSize: 11 }}>
                      {localizeSolarTermName(day.solarTermToday.name, locale)}
                    </Text>
                  ) : (
                    <Text style={{ color: P.dim, fontSize: 11, textDecorationLine: 'underline' }}>
                      {C.nayinLine(nayin)}
                    </Text>
                  )}
                </Pressable>
              </View>

              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Strip
                  text={day.lunarDate ? C.lunarLine(day.lunarDate) : ''}
                  term='农历'
                  onPress={tap}
                  style={vStyle(P)}
                />
                <Strip
                  text={yg ? C.yearLine(yg.stem, yg.branch, yg.animal) : ''}
                  term='岁次'
                  onPress={tap}
                  style={vStyle(P)}
                />
              </View>
            </View>
          ) : (
            /* en 横排 */
            <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                }}
              >
                <Text
                  style={{
                    color: P.ink,
                    fontSize: 76,
                    lineHeight: 84,
                    fontWeight: '700',
                  }}
                >
                  {d.getDate()}
                </Text>
                <View style={{ gap: 2, alignItems: 'flex-end' }}>
                  <Pressable onPress={() => tap('干支')} hitSlop={4}>
                    <Text style={{ color: P.ink, fontSize: 13, textDecorationLine: 'underline' }}>
                      {day.ganZhi}
                      {C.ganZhiSuffix}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => tap('建除')} hitSlop={4}>
                    <Text style={{ color: P.ink, fontSize: 13, textDecorationLine: 'underline' }}>
                      {C.rowOfficer} {day.dayOfficer}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => tap('值神')} hitSlop={4}>
                    <Text style={{ color: P.ink, fontSize: 13, textDecorationLine: 'underline' }}>
                      {C.rowDayGod} {day.dayGod?.name ?? ''}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => tap('星宿')} hitSlop={4}>
                    <Text style={{ color: P.ink, fontSize: 13, textDecorationLine: 'underline' }}>
                      {C.rowMansion}{' '}
                      {day.mansion
                        ? `${day.mansion.name}${day.mansion.luminary}${day.mansion.animal}`
                        : ''}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => tap('纳音')} hitSlop={4}>
                    <Text style={{ color: P.gold, fontSize: 13, textDecorationLine: 'underline' }}>
                      {C.nayinLine(nayin)}
                    </Text>
                  </Pressable>
                </View>
              </View>
              <Text style={{ color: P.dim, fontSize: 12 }}>
                {day.lunarDate ? C.lunarLine(day.lunarDate) : ''}
                {yg ? ` · ${C.yearLine(yg.stem, yg.branch, yg.animal)}` : ''}
                {day.solarTermToday
                  ? ` · ${localizeSolarTermName(day.solarTermToday.name, locale)}`
                  : ''}
              </Text>
            </View>
          )}

          {/* 冲煞 / 彭祖 — 可点解释 */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: 12,
              marginTop: spacing.sm,
            }}
          >
            {day.clash ? (
              <Pressable onPress={() => tap('冲煞')} hitSlop={6}>
                <Text
                  style={{
                    color: P.dim,
                    fontSize: 11,
                    letterSpacing: 1,
                    textDecorationLine: 'underline',
                  }}
                >
                  {C.clashText(day.clash.clashAnimal, day.evilDirection)}
                </Text>
              </Pressable>
            ) : null}
            {day.pengZu ? (
              <Pressable onPress={() => tap('彭祖百忌')} hitSlop={6}>
                <Text
                  style={{
                    color: P.dim,
                    fontSize: 11,
                    letterSpacing: 1,
                    textDecorationLine: 'underline',
                  }}
                >
                  {C.pengzuText(day.pengZu.stem, day.pengZu.branch)}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* 宜忌 — 框内全宽平铺（动词可点释义） */}
          <View style={{ borderTopWidth: 0.5, borderTopColor: P.ink, marginTop: spacing.md }}>
            {yangGong ? (
              <View style={{ alignItems: 'center', paddingTop: spacing.md }}>
                <Text
                  style={{
                    backgroundColor: P.goldSoft,
                    color: P.brown,
                    fontSize: 11,
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    letterSpacing: 1,
                  }}
                >
                  {C.yangGongNote}
                </Text>
              </View>
            ) : null}
            <YijiBlock label='宜' labelColor={P.gold} items={goodFor} P={P} onSelect={tap} />
            <View style={{ height: 0.5, backgroundColor: P.ink, marginVertical: spacing.sm }} />
            <YijiBlock label='忌' labelColor={P.brown} items={avoid} P={P} onSelect={tap} />
          </View>
        </View>
      </View>

      {/* ══ 生辰八字五行 ══ */}
      <View>
        <RuleTitle title={C.sectionPillars} P={P} />
        <View style={{ borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: P.ink }}>
          {[
            pillars.map((p) => p.label),
            pillars.map((p) => p.ganzhi),
            pillars.map((p) => p.nayin),
          ].map((rowCells, ri) => (
            <View
              key={ri}
              style={{
                flexDirection: 'row',
                borderTopWidth: ri === 0 ? 0 : 0.5,
                borderTopColor: P.ink,
              }}
            >
              {rowCells.map((c, ci) => (
                <Text
                  key={ci}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    color: ri === 0 ? P.dim : ri === 1 ? P.ink : P.gold,
                    fontSize: ri === 1 ? 18 : 12,
                    letterSpacing: ri === 1 ? 2 : 1,
                    paddingVertical: 9,
                    borderLeftWidth: ci === 0 ? 0 : 0.5,
                    borderLeftColor: P.ink,
                  }}
                >
                  {c}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* ══ 信息行 ══ */}
      <View>
        <RuleTitle title={C.sectionInfo} P={P} />
        <View style={{ borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: P.ink }}>
          {rows.map(([label, value, sub, term], i) => (
            <View
              key={label}
              style={{
                flexDirection: 'row',
                gap: spacing.md,
                paddingVertical: 9,
                borderTopWidth: i === 0 ? 0 : 0.5,
                borderTopColor: P.ink,
              }}
            >
              <Text style={{ color: P.dim, fontSize: 12, letterSpacing: 2, width: 76 }}>
                {rowLabel(label)}
              </Text>
              <View style={{ flex: 1 }}>
                {term ? (
                  <Pressable onPress={() => tap(term)} hitSlop={4}>
                    <Text
                      style={{
                        color: P.ink,
                        fontSize: 14,
                        textDecorationLine: 'underline',
                      }}
                    >
                      {value}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={{ color: P.ink, fontSize: 14 }}>{value}</Text>
                )}
                {sub ? (
                  <Text style={{ color: P.dim, fontSize: 12, marginTop: 2 }}>{sub}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* ══ 时辰吉凶 ══ */}
      <View>
        <RuleTitle title={C.sectionHours} P={P} />
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            borderLeftWidth: 0.5,
            borderTopWidth: 0.5,
            borderColor: P.ink,
          }}
        >
          {day.hours.map((h, i) => {
            const { god, lucky } = hourGod(dayBranch, i)
            const godName = C.hourGodName(god)
            return (
              <View
                key={h.branch}
                style={{
                  width: '25%',
                  borderRightWidth: 0.5,
                  borderBottomWidth: 0.5,
                  borderColor: P.ink,
                  paddingVertical: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: P.ink, fontSize: 13, letterSpacing: 1 }}>
                  {locale === 'en' ? h.name : `${h.ganZhi}时`}
                </Text>
                {godName ? (
                  <Text style={{ color: P.dim, fontSize: 10, marginTop: 1 }}>{godName}</Text>
                ) : null}
                <Text
                  style={{
                    color: lucky ? P.gold : P.brown,
                    fontSize: 12,
                    fontWeight: '700',
                    marginTop: 2,
                  }}
                >
                  {lucky ? C.goodWord : C.badWord}
                </Text>
              </View>
            )
          })}
        </View>
      </View>

      {/* ══ 吉神方位 ══ */}
      <View>
        <RuleTitle title={C.sectionGods} P={P} />
        <View
          style={{
            flexDirection: 'row',
            borderLeftWidth: 0.5,
            borderTopWidth: 0.5,
            borderColor: P.ink,
          }}
        >
          <GodTile label={C.godWealth} value={caishenDirection(day.ganZhi[0] ?? '') ?? '—'} P={P} />
          <GodTile label={C.godJoy} value={xishenDirection(day.ganZhi[0] ?? '') ?? '—'} P={P} />
        </View>
      </View>

      {/* ══ 刑冲害合 ══ */}
      {relationLine ? (
        <Text style={{ color: P.dim, fontSize: 13, lineHeight: 21, textAlign: 'center' }}>
          {relationLine}
        </Text>
      ) : null}

      {/* ══ 于你 ══ */}
      {fit ? (
        <View>
          <RuleTitle title={C.forYouLabel} P={P} />
          <Text
            style={{
              color: fit === '吉' ? P.gold : fit === '凶' ? P.brown : P.ink,
              fontSize: 16,
              letterSpacing: 2,
            }}
          >
            {t.personal.fitClassical[fit]}
          </Text>
          <Text style={{ color: P.ink, fontSize: 14, lineHeight: 23, marginTop: 4 }}>
            {t.personal.summaryClassical[fit]}
          </Text>
        </View>
      ) : null}

      <YiJiMeaningSheet
        term={meaningTerm}
        detail={meaningTerm ? explainDetail(meaningTerm) : null}
        meaning={sheetMeaning}
        emptyText={C.emptyMeaning}
        footnote={C.meaningFootnote}
        onClose={() => setMeaningTerm(null)}
      />
    </View>
  )
}

function vStyle(P: Palette): TextStyle {
  return { color: P.ink, fontSize: 12, letterSpacing: 2, lineHeight: 20 }
}

/** 竖排条 — 可点击弹出术语解释。 */
function Strip({
  text,
  term,
  onPress,
  style,
}: {
  text: string
  term: string
  onPress: (term: string) => void
  style?: TextStyle
}) {
  return (
    <Pressable onPress={() => onPress(term)} hitSlop={4}>
      <View>
        {text.split('').map((c, i) => (
          <Text key={`${c}-${i}`} style={style}>
            {c}
          </Text>
        ))}
      </View>
    </Pressable>
  )
}

/** 通书式节标题 — 左右细线夹标题。 */
function RuleTitle({ title, P }: { title: string; P: Palette }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 14 }}>
      <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: P.ink }} />
      <Text style={{ color: P.ink, fontSize: 12, letterSpacing: 3 }}>{title}</Text>
      <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: P.ink }} />
    </View>
  )
}

/** 宜/忌块 — 栏头 + 动词全宽平铺；有释义的词可点击弹出。 */
function YijiBlock({
  label,
  labelColor,
  items,
  P,
  onSelect,
}: {
  label: string
  labelColor: string
  items: string[]
  P: Palette
  onSelect: (term: string) => void
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingTop: 10 }}>
      <Text
        style={{
          color: labelColor,
          fontSize: 17,
          fontWeight: '700',
          letterSpacing: 2,
          lineHeight: 28,
        }}
      >
        {label}
      </Text>
      <Text style={{ flex: 1, color: P.ink, fontSize: 15, lineHeight: 28, letterSpacing: 1 }}>
        {items.length === 0
          ? '—'
          : items.map((v, i) => (
              <Text key={v}>
                {i > 0 ? '　' : ''}
                <Text style={{ textDecorationLine: 'underline' }} onPress={() => onSelect(v)}>
                  {v}
                </Text>
              </Text>
            ))}
      </Text>
    </View>
  )
}

function GodTile({ label, value, P }: { label: string; value: string; P: Palette }) {
  return (
    <View
      style={{
        flex: 1,
        borderRightWidth: 0.5,
        borderBottomWidth: 0.5,
        borderColor: P.ink,
        paddingVertical: 10,
        alignItems: 'center',
      }}
    >
      <Text style={{ color: P.dim, fontSize: 11, letterSpacing: 2 }}>{label}</Text>
      <Text
        style={{
          color: P.gold,
          fontSize: 17,
          fontWeight: '700',
          marginTop: 4,
          letterSpacing: 1,
        }}
      >
        {value}
      </Text>
    </View>
  )
}
