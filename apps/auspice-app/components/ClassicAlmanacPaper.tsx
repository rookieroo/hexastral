/**
 * ClassicAlmanacPaper — 撕页黄历 1:1 结构（无回历/对联/洛书/胎神/插画/潮汐）。
 * Hero：年号 + 大公历日 + 八月大；下半网格：吉神/吉色 | 时辰 | 宜忌+纳音/彭祖 | 冲建值.
 * 能译的标签走 locale；干支、方位、吉凶、建除名、八字保留中文。
 */

import {
  BRANCH_ZODIAC,
  branchRelationSummary,
  type EarthlyBranch,
  formatYijiVerb,
  getLeapMonthDays,
  getLunarMonthDays,
} from '@zhop/astro-core'
import type { ReactNode } from 'react'
import { Text, type TextStyle, View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { almanacCopy } from '@/lib/almanac-copy'
import type { AlmanacPalette } from '@/lib/almanac-palette'
import type { AuspiceDay } from '@/lib/api'
import { localizeSolarTermName } from '@/lib/culture'
import {
  caishenDirection,
  guishenDirection,
  hourGod,
  isYangGongDay,
  monthPillar,
  nayinOf,
  xishenDirection,
} from '@/lib/huangli-day'
import type { Locale } from '@/lib/i18n'
import { resolveRegisterSync } from '@/lib/yiji-display-mode'

function lunarDaXiao(ld: { year: number; month: number; isLeap: boolean }): '大' | '小' {
  const n = ld.isLeap ? getLeapMonthDays(ld.year) : getLunarMonthDays(ld.year, ld.month)
  return n >= 30 ? '大' : '小'
}

function VStrip({
  text,
  onPress,
  style,
}: {
  text: string
  onPress?: () => void
  style: TextStyle
}) {
  const body = (
    <View>
      {text.split('').map((c, i) => (
        <Text key={`${c}-${i}`} style={style}>
          {c}
        </Text>
      ))}
    </View>
  )
  if (!onPress) return body
  return (
    <Pressable onPress={onPress} hitSlop={4}>
      {body}
    </Pressable>
  )
}

function InkCell({
  children,
  P,
  flex = 1,
  noRight,
  pad = 3,
}: {
  children: ReactNode
  P: AlmanacPalette
  flex?: number
  noRight?: boolean
  pad?: number
}) {
  return (
    <View
      style={{
        flex,
        borderRightWidth: noRight ? 0 : 0.5,
        borderBottomWidth: 0.5,
        borderColor: P.ink,
        padding: pad,
        justifyContent: 'center',
        minWidth: 0,
        minHeight: 0,
      }}
    >
      {children}
    </View>
  )
}

const SLOT_FORYOU = 44
const SLOT_HEAD = 42
const SLOT_HOURS = 40
/** 今日八字 / 五行 / 彭祖 共用底栏，三列标题齐平. */
const SLOT_FOOTER = 76

function padSlots(
  items: Array<{ canonical: string; label: string }>,
  n: number
): Array<{ canonical: string; label: string }> {
  const out = items.slice(0, n)
  while (out.length < n) out.push({ canonical: '', label: '' })
  return out
}

/** 宜/忌：圆章 + 三行两字词，底栏补纳音/彭祖，避免格底空一截. */
function YiJiColumn({
  label,
  items,
  P,
  en,
  noRight,
  onSelect,
  footer,
}: {
  label: string
  items: Array<{ canonical: string; label: string }>
  P: AlmanacPalette
  en: boolean
  noRight?: boolean
  onSelect: (canonical: string) => void
  footer?: ReactNode
}) {
  const shown = padSlots(items, 6)
  return (
    <View
      style={{
        flex: 1,
        minHeight: 0,
        borderRightWidth: noRight ? 0 : 0.5,
        borderColor: P.ink,
        paddingTop: 4,
        paddingHorizontal: 3,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          borderWidth: 1.5,
          borderColor: P.ink,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: P.ink, fontSize: 15, fontWeight: '700' }}>{label}</Text>
      </View>
      <View style={{ width: '100%', marginTop: 4, flex: 1 }}>
        {[0, 1, 2].map((ri) => (
          <View key={ri} style={{ flexDirection: 'row' }}>
            {shown.slice(ri * 2, ri * 2 + 2).map((item, ci) => (
              <Pressable
                key={`${ri}-${ci}-${item.canonical}`}
                onPress={() => {
                  if (item.canonical) onSelect(item.canonical)
                }}
                style={{ flex: 1, height: 22, justifyContent: 'center' }}
              >
                <Text
                  style={{
                    color: P.ink,
                    fontSize: en ? 11 : 13,
                    lineHeight: 18,
                    textAlign: 'center',
                    letterSpacing: en ? 0 : 1,
                    textDecorationLine: item.canonical ? 'underline' : 'none',
                  }}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
      {footer ? (
        <View
          style={{
            height: SLOT_FOOTER,
            width: '100%',
            paddingTop: 6,
            paddingHorizontal: 2,
            borderTopWidth: 0.5,
            borderColor: P.ink,
            justifyContent: 'flex-start',
          }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  )
}

function MetaBlock({
  label,
  value,
  P,
  en,
  onPress,
}: {
  label: string
  value: string
  P: AlmanacPalette
  en: boolean
  onPress?: () => void
}) {
  const body = (
    <View>
      <Text style={{ color: P.dim, fontSize: en ? 10 : 11, letterSpacing: en ? 0 : 1 }}>
        {label}
      </Text>
      <Text
        style={{
          color: P.ink,
          fontSize: en ? 12 : 13,
          lineHeight: 18,
          textDecorationLine: onPress ? 'underline' : 'none',
          marginTop: 1,
        }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  )
  if (!onPress) return body
  return <Pressable onPress={onPress}>{body}</Pressable>
}

export function ClassicAlmanacPaper({
  date,
  day,
  locale,
  P,
  interactive,
  capturing,
  onTapTerm,
  onOpenCalendar,
  forYouSlot,
}: {
  date: string
  day: AuspiceDay
  locale: Locale
  P: AlmanacPalette
  interactive: boolean
  capturing: boolean
  onTapTerm: (term: string) => void
  onOpenCalendar?: () => void
  forYouSlot?: ReactNode
}) {
  const C = almanacCopy(locale)
  const insets = useSafeAreaInsets()
  const heroGutter = 16
  const register = resolveRegisterSync(locale, true)
  const verb = (v: string) => formatYijiVerb(v, locale, register)
  const d = new Date(`${date}T00:00:00`)
  const yg = day.yearGanZhi
  const dayBranch = day.ganZhi[1] ?? ''
  const stem = day.ganZhi[0] ?? ''
  const monthP = yg ? monthPillar(yg.stem, day.solarTerm.prev.name) : null
  const hourPillar = day.hours[0]?.ganZhi ?? ''
  const goodFor = day.goodFor.map((canonical) => ({ canonical, label: verb(canonical) }))
  const avoid = day.avoid.map((canonical) => ({ canonical, label: verb(canonical) }))
  const tap = interactive ? onTapTerm : () => {}
  const en = locale === 'en'
  const nayin = nayinOf(day.ganZhi)
  const yangGong = day.lunarDate ? isYangGongDay(day.lunarDate.month, day.lunarDate.day) : false
  const pengzu = day.pengZu ? C.pengzuText(day.pengZu.stem, day.pengZu.branch) : '—'

  const termName = day.solarTermToday
    ? localizeSolarTermName(day.solarTermToday.name, locale)
    : day.solarTerm.next.name
      ? localizeSolarTermName(day.solarTerm.next.name, locale)
      : '—'

  const pillars = [yg ? `${yg.stem}${yg.branch}` : '', monthP ?? '', day.ganZhi, hourPillar].filter(
    Boolean
  )
  const stemLine = pillars.map((p) => p[0] ?? '').join('')
  const branchLine = pillars.map((p) => p[1] ?? '').join('')

  const sanhe = (() => {
    if (!dayBranch || !(dayBranch in BRANCH_ZODIAC)) return null
    const triple = branchRelationSummary(dayBranch as EarthlyBranch).triple
    if (triple.length === 0) return null
    const names = triple.map((b) => (en ? C.animal(b) : (BRANCH_ZODIAC[b] ?? b)))
    return names.join(en ? ' · ' : '')
  })()

  const vStyle: TextStyle = {
    color: P.ink,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 1,
    textAlign: 'center',
  }

  const dayNum = (
    <Text
      style={{
        color: P.ink,
        fontSize: 84,
        lineHeight: 88,
        fontWeight: '700',
        letterSpacing: 0,
        fontVariant: ['tabular-nums'],
        minWidth: 112,
        textAlign: 'center',
      }}
    >
      {d.getDate()}
    </Text>
  )

  const heroStack = (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text
        style={{
          color: P.dim,
          fontSize: 12,
          letterSpacing: 2,
          fontVariant: ['tabular-nums'],
          marginBottom: 2,
        }}
      >
        {d.getFullYear()}
      </Text>
      {dayNum}
      <Text
        style={{
          color: P.ink,
          fontSize: en ? 12 : 13,
          fontWeight: '600',
          letterSpacing: en ? 1 : 2,
          marginTop: 2,
        }}
      >
        {C.heroGregorianMonth(d)}
      </Text>
    </View>
  )

  const gods: Array<{ name: string; dir: string }> = [
    { name: C.godJoy, dir: xishenDirection(stem) ?? '—' },
    { name: C.godNoble, dir: guishenDirection(stem) ?? '—' },
    { name: C.godWealth, dir: caishenDirection(stem) ?? '—' },
  ]

  const lunarDay = day.lunarDate?.dayName ?? '—'
  const lunarMonth = day.lunarDate?.monthName ?? ''
  const yearGz = yg ? `${yg.stem}${yg.branch}年` : ''
  const lunarMonthSize = day.lunarDate ? `${lunarMonth}${lunarDaXiao(day.lunarDate)}` : lunarMonth

  return (
    <View
      style={{
        flex: 1,
        minHeight: 0,
        paddingLeft: Math.max(insets.left, heroGutter),
        paddingRight: Math.max(insets.right, heroGutter),
        paddingBottom: Math.max(insets.bottom, 8) + 6,
      }}
    >
      {/* 主日：与表格按固定 flex 比分配，不跟文案行数走 */}
      <View
        style={{
          flex: 1,
          minHeight: 0,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ width: 36, alignItems: 'center', gap: 8 }}>
          <VStrip
            text={`${day.ganZhi}日`}
            onPress={interactive ? () => tap('干支') : undefined}
            style={vStyle}
          />
          <VStrip
            text={`${day.dayOfficer}日`}
            onPress={interactive ? () => tap('建除') : undefined}
            style={vStyle}
          />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {onOpenCalendar && interactive && !capturing ? (
            <Pressable onPress={onOpenCalendar} hitSlop={10}>
              {heroStack}
            </Pressable>
          ) : (
            heroStack
          )}
        </View>
        <View style={{ width: 36, alignItems: 'center' }}>
          {day.lunarDate ? (
            <VStrip
              text={`${lunarMonth}${lunarDay}`}
              onPress={interactive ? () => tap('农历') : undefined}
              style={vStyle}
            />
          ) : null}
        </View>
      </View>

      {/* 于你：无生辰也占位，避免邻页表格顶边上跳 */}
      <View
        style={{
          height: SLOT_FORYOU,
          backgroundColor: P.goldSoft,
          paddingHorizontal: 8,
          justifyContent: 'center',
        }}
      >
        {forYouSlot}
      </View>

      {/* 下表：固定表头/时辰，余下三列等宽 */}
      <View style={{ flex: 1.35, minHeight: 0, paddingBottom: 4, paddingTop: 4 }}>
        <View style={{ flex: 1, borderWidth: 2, borderColor: P.ink, padding: 2 }}>
          <View style={{ flex: 1, borderWidth: 0.5, borderColor: P.ink }}>
            {/* 初三日 | 处暑 | 星期六 */}
            <View style={{ height: SLOT_HEAD, flexDirection: 'row' }}>
              <InkCell P={P} flex={1.15} pad={4}>
                <Text
                  style={{
                    color: P.ink,
                    fontSize: 22,
                    fontWeight: '700',
                    textAlign: 'center',
                    letterSpacing: 1,
                  }}
                >
                  {lunarDay}
                </Text>
                <Text style={{ color: P.dim, fontSize: 11, textAlign: 'center' }} numberOfLines={1}>
                  {yearGz}
                  {lunarMonthSize}
                </Text>
              </InkCell>
              <InkCell P={P} flex={1} pad={4}>
                <Text
                  style={{
                    color: P.ink,
                    fontSize: 16,
                    fontWeight: '700',
                    textAlign: 'center',
                    letterSpacing: 1,
                  }}
                >
                  {termName}
                </Text>
                {day.festivalToday ? (
                  <Text
                    style={{ color: P.dim, fontSize: 11, textAlign: 'center', marginTop: 1 }}
                    numberOfLines={1}
                  >
                    {day.festivalToday.name}
                  </Text>
                ) : null}
              </InkCell>
              <InkCell P={P} flex={1.15} noRight pad={4}>
                <Text
                  style={{
                    color: P.ink,
                    fontSize: en ? 16 : 20,
                    fontWeight: '700',
                    textAlign: 'center',
                    letterSpacing: 1,
                  }}
                  numberOfLines={1}
                >
                  {C.weekday(d)}
                </Text>
                {locale === 'ja' && day.rokuyo ? (
                  <Text
                    style={{ color: P.dim, fontSize: 11, textAlign: 'center', marginTop: 1 }}
                    numberOfLines={1}
                  >
                    {day.rokuyo.name}
                  </Text>
                ) : null}
              </InkCell>
            </View>

            {/* 十二时辰横排 — 支 + 吉/凶（原图标记，各语言保留） */}
            <View
              style={{
                height: SLOT_HOURS,
                flexDirection: 'row',
                borderBottomWidth: 0.5,
                borderColor: P.ink,
              }}
            >
              {day.hours.slice(0, 12).map((h, i) => {
                const { lucky } = hourGod(dayBranch, i)
                return (
                  <View
                    key={h.branch}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      paddingVertical: 0,
                      justifyContent: 'center',
                      borderRightWidth: i === 11 ? 0 : 0.5,
                      borderColor: P.ink,
                    }}
                  >
                    <Text style={{ color: P.ink, fontSize: 12 }}>{h.branch}</Text>
                    <Text
                      style={{
                        color: P.ink,
                        fontSize: 12,
                        fontWeight: lucky ? '700' : '400',
                        marginTop: 1,
                      }}
                    >
                      {lucky ? '吉' : '凶'}
                    </Text>
                  </View>
                )
              })}
            </View>

            <View style={{ flex: 1, flexDirection: 'row', minHeight: 0 }}>
              {/* 左：吉神方位贴顶；今日八字占余下格 */}
              <View style={{ flex: 1.1, borderRightWidth: 0.5, borderColor: P.ink }}>
                <View
                  style={{
                    flex: 1,
                    paddingHorizontal: 6,
                    paddingTop: 2,
                    paddingBottom: 4,
                    gap: 4,
                    justifyContent: 'flex-start',
                    borderBottomWidth: 0.5,
                    borderColor: P.ink,
                  }}
                >
                  <Text
                    style={{ color: P.dim, fontSize: en ? 10 : 12, letterSpacing: en ? 0 : 1 }}
                    numberOfLines={1}
                  >
                    {C.sectionGods}
                  </Text>
                  {gods.map((g) => (
                    <View
                      key={g.name}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        gap: 4,
                      }}
                    >
                      <Text style={{ color: P.ink, fontSize: en ? 12 : 14 }}>{g.name}</Text>
                      <Text style={{ color: P.ink, fontSize: 14, fontWeight: '700' }}>{g.dir}</Text>
                    </View>
                  ))}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      gap: 4,
                    }}
                  >
                    <Text style={{ color: P.ink, fontSize: en ? 12 : 14 }}>{C.rowLuckColor}</Text>
                    <Text style={{ color: P.ink, fontSize: 14, fontWeight: '700' }}>
                      {day.auspiciousColor || '—'}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      gap: 4,
                    }}
                  >
                    <Text style={{ color: P.ink, fontSize: en ? 12 : 14 }}>{C.rowLuckDir}</Text>
                    <Text style={{ color: P.ink, fontSize: 14, fontWeight: '700' }}>
                      {day.auspiciousDirection || '—'}
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    height: SLOT_FOOTER,
                    paddingHorizontal: 6,
                    paddingTop: 6,
                    justifyContent: 'flex-start',
                    gap: 2,
                  }}
                >
                  <Text
                    style={{ color: P.dim, fontSize: en ? 10 : 12, letterSpacing: en ? 0 : 1 }}
                    numberOfLines={1}
                  >
                    {C.sectionBazi}
                  </Text>
                  {stemLine ? (
                    <>
                      <Text
                        style={{
                          color: P.ink,
                          fontSize: 20,
                          fontWeight: '700',
                          letterSpacing: 5,
                          textAlign: 'center',
                        }}
                      >
                        {stemLine}
                      </Text>
                      <Text
                        style={{
                          color: P.ink,
                          fontSize: 20,
                          fontWeight: '700',
                          letterSpacing: 5,
                          textAlign: 'center',
                        }}
                      >
                        {branchLine}
                      </Text>
                    </>
                  ) : (
                    <Text style={{ color: P.ink, textAlign: 'center' }}>—</Text>
                  )}
                </View>
              </View>

              {/* 中：宜 | 忌 圆章 + 词表顶对齐 */}
              <View
                style={{
                  flex: 1.35,
                  flexDirection: 'row',
                  borderRightWidth: 0.5,
                  borderColor: P.ink,
                }}
              >
                <YiJiColumn
                  label='宜'
                  items={goodFor}
                  P={P}
                  en={en}
                  onSelect={tap}
                  footer={
                    <Pressable onPress={() => tap('纳音')}>
                      <Text
                        style={{
                          color: P.dim,
                          fontSize: en ? 10 : 12,
                          letterSpacing: en ? 0 : 1,
                          textAlign: 'center',
                        }}
                      >
                        {C.rowElement}
                      </Text>
                      <Text
                        style={{
                          color: P.ink,
                          fontSize: en ? 12 : 13,
                          textAlign: 'center',
                          marginTop: 2,
                          textDecorationLine: 'underline',
                        }}
                        numberOfLines={1}
                      >
                        {nayin ? C.nayinLine(nayin) : '—'}
                      </Text>
                    </Pressable>
                  }
                />
                <YiJiColumn
                  label='忌'
                  items={avoid}
                  P={P}
                  en={en}
                  noRight
                  onSelect={tap}
                  footer={
                    <Pressable onPress={() => tap('彭祖百忌')}>
                      {yangGong ? (
                        <Text
                          style={{
                            color: P.ink,
                            fontSize: 11,
                            lineHeight: 14,
                            textAlign: 'center',
                            marginBottom: 2,
                          }}
                          numberOfLines={2}
                        >
                          {C.yangGongNote}
                        </Text>
                      ) : null}
                      <Text
                        style={{
                          color: P.dim,
                          fontSize: en ? 10 : 12,
                          letterSpacing: en ? 0 : 1,
                          textAlign: 'center',
                        }}
                      >
                        {C.rowPengZu}
                      </Text>
                      <Text
                        style={{
                          color: P.ink,
                          fontSize: en ? 12 : 13,
                          textAlign: 'center',
                          marginTop: 2,
                          textDecorationLine: 'underline',
                        }}
                        numberOfLines={2}
                      >
                        {pengzu}
                      </Text>
                    </Pressable>
                  }
                />
              </View>

              {/* 右：冲建值宿顶对齐密排 */}
              <View
                style={{
                  flex: 1,
                  paddingHorizontal: 6,
                  paddingTop: 4,
                  paddingBottom: 5,
                  justifyContent: 'flex-start',
                  gap: 6,
                }}
              >
                <MetaBlock
                  label={C.rowClash}
                  value={day.clash ? C.clashText(day.clash.clashAnimal, day.evilDirection) : '—'}
                  P={P}
                  en={en}
                  onPress={() => tap('冲煞')}
                />
                <MetaBlock label={C.rowSanhe} value={sanhe ?? '—'} P={P} en={en} />
                <MetaBlock
                  label={C.rowOfficer}
                  value={`${day.dayOfficer}日`}
                  P={P}
                  en={en}
                  onPress={() => tap('建除')}
                />
                <MetaBlock
                  label={C.rowDayGod}
                  value={day.dayGod?.name ?? '—'}
                  P={P}
                  en={en}
                  onPress={() => tap('值神')}
                />
                <MetaBlock
                  label={C.rowMansion}
                  value={
                    day.mansion
                      ? `${day.mansion.name}${day.mansion.luminary}${day.mansion.animal}`
                      : '—'
                  }
                  P={P}
                  en={en}
                  onPress={() => tap('星宿')}
                />
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}
