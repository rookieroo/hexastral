/**
 * BaziPreliminarySheet — the no-IAP phase 八字初判 (free, deterministic, on-device).
 *
 * While banking/IAP are not ready, the 亲友「看你我如何相契」 toggle must NOT advertise
 * the Yuel 合盘 hand-off (there is no Pro and no Yuel to hand off to). This sheet is the
 * fallback: it derives both 八字 from the two birth profiles with `@zhop/astro-core`
 * (`getFourPillars` + `resolveBirthHour` — no LLM, no network; a precise clock +
 * city runs the same 真太阳时 calibration the chart engine uses) and renders a
 * light first reading:
 *
 *   1. the 生肖 verdict (合/冲/平) — the same engine the Pro 关系 reading uses
 *   2. 八字初判: 日主五行 + 年支 / 月支 / 日支 relations, each with a one-line gloss
 *   3. a soft aggregate 初判 (相契 / 平和 / 需磨合) — cultural reference, NOT a prediction
 *
 * The full 合盘 (RelationshipSheet + Yuel hand-off) returns when IAP + Yuel ship; this
 * component is only mounted while `isIapEnabled()` is false (see app/people.tsx).
 * If either birth year is unknown (sentinel 0000) the 八字 can't be derived — the sheet
 * degrades to the 生肖 verdict + a note asking for the year.
 */

import {
  type BranchRelation,
  getBranchRelation,
  getFourPillars,
  getWuXingRelation,
  lunarToSolar,
  resolveBirthHour,
  STEM_WUXING,
  type WuXingRelation,
} from '@zhop/astro-core'
import { useTheme } from '@zhop/core-ui'
import { SatelliteBottomSheet } from '@zhop/satellite-ui'
import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { AuspiceBirthInfo } from '@/lib/birth'
import type { Locale } from '@/lib/i18n'
import { useStrings } from '@/lib/i18n-context'
import type { AuspicePerson } from '@/lib/people'
import { type RelVerdict, relationship } from '@/lib/relationship'
import { useVoiceMode } from '@/lib/voice-mode-context'
import { RelationshipSeal } from './RelationshipSeal'

interface PrelimCopy {
  title: string
  zodiacLine: Record<RelVerdict, string>
  dayMasterLabel: string
  yearBranchLabel: string
  monthBranchLabel: string
  dayBranchLabel: string
  wuxingName: Record<WuXingRelation, string>
  branchName: Record<BranchRelation, string>
  dayMasterLine: Record<WuXingRelation, string>
  branchLine: Record<BranchRelation, string>
  harmonious: string
  neutral: string
  friction: string
  yearMissing: string
}

const L: Record<Locale, PrelimCopy> = {
  'zh-Hans': {
    title: '相契初判',
    zodiacLine: {
      合: '生肖相合，相处和顺；多走动，情分更添。',
      冲: '生肖相冲，性子易碰；多一分体谅，便化冲为合。',
      平: '生肖平和，各自安好；顺其自然即可。',
    },
    dayMasterLabel: '日主五行',
    yearBranchLabel: '年支缘分',
    monthBranchLabel: '月支生活',
    dayBranchLabel: '日支亲密',
    wuxingName: { 相生: '相生', 被生: '被生', 比和: '比和', 相克: '相克', 被克: '被克' },
    branchName: {
      六合: '六合',
      三合: '三合',
      比和: '比和',
      无关: '无关',
      刑: '相刑',
      害: '相害',
      冲: '相冲',
    },
    dayMasterLine: {
      相生: '你的日主滋养对方，相处自然融洽。',
      被生: '对方的日主滋养你，有被照顾之感。',
      比和: '两人日主同气，志趣相投。',
      相克: '你的日主克制对方，需多一分包容。',
      被克: '对方的日主克制你，相处需要沟通。',
    },
    branchLine: {
      六合: '地支六合，默契天成。',
      三合: '同属三合局，和谐共生。',
      比和: '地支相同，容易理解彼此。',
      无关: '无特殊生克，各自独立。',
      刑: '地支相刑，此处易有摩擦。',
      害: '地支相害，需更多耐心。',
      冲: '地支相冲，节奏不同，是挑战也是互补。',
    },
    harmonious: '初判：相契 — 多维度相合，相处自然。',
    neutral: '初判：平和 — 有合有让，顺其自然。',
    friction: '初判：需磨合 — 节奏有差，多沟通即化。',
    yearMissing: '补全双方的出生年份，即可推算八字初判。',
  },
  'zh-Hant': {
    title: '相契初判',
    zodiacLine: {
      合: '生肖相合，相處和順；多走動，情分更添。',
      冲: '生肖相沖，性子易碰；多一分體諒，便化沖為合。',
      平: '生肖平和，各自安好；順其自然即可。',
    },
    dayMasterLabel: '日主五行',
    yearBranchLabel: '年支緣分',
    monthBranchLabel: '月支生活',
    dayBranchLabel: '日支親密',
    wuxingName: { 相生: '相生', 被生: '被生', 比和: '比和', 相克: '相剋', 被克: '被剋' },
    branchName: {
      六合: '六合',
      三合: '三合',
      比和: '比和',
      无关: '無關',
      刑: '相刑',
      害: '相害',
      冲: '相沖',
    },
    dayMasterLine: {
      相生: '你的日主滋養對方，相處自然融洽。',
      被生: '對方的日主滋養你，有被照顧之感。',
      比和: '兩人日主同氣，志趣相投。',
      相克: '你的日主剋制對方，需多一分包容。',
      被克: '對方的日主剋制你，相處需要溝通。',
    },
    branchLine: {
      六合: '地支六合，默契天成。',
      三合: '同屬三合局，和諧共生。',
      比和: '地支相同，容易理解彼此。',
      无关: '無特殊生剋，各自獨立。',
      刑: '地支相刑，此處易有摩擦。',
      害: '地支相害，需更多耐心。',
      冲: '地支相沖，節奏不同，是挑戰也是互補。',
    },
    harmonious: '初判：相契 — 多維度相合，相處自然。',
    neutral: '初判：平和 — 有合有讓，順其自然。',
    friction: '初判：需磨合 — 節奏有差，多溝通即化。',
    yearMissing: '補全雙方的出生年份，即可推算八字初判。',
  },
  ja: {
    title: '相性の初判',
    zodiacLine: {
      合: '干支の相性が良く、和やかに過ごせる間柄。',
      冲: '干支が相沖；少しの思いやりで角が取れる。',
      平: '干支は穏やかな関係；自然体で問題なし。',
    },
    dayMasterLabel: '日主五行',
    yearBranchLabel: '年支の縁',
    monthBranchLabel: '月支の暮らし',
    dayBranchLabel: '日支の親しみ',
    wuxingName: { 相生: '相生', 被生: '被生', 比和: '比和', 相克: '相剋', 被克: '被剋' },
    branchName: {
      六合: '六合',
      三合: '三合',
      比和: '比和',
      无关: '無関係',
      刑: '相刑',
      害: '相害',
      冲: '相沖',
    },
    dayMasterLine: {
      相生: 'あなたの日主が相手を生じ、自然に調和します。',
      被生: '相手の日主があなたを生じ、支えられる関係です。',
      比和: '日主が同気で、気が合います。',
      相克: 'あなたの日主が相手を剋し、寛容さが必要です。',
      被克: '相手の日主があなたを剋し、対話が大切です。',
    },
    branchLine: {
      六合: '地支六合、自然な相性です。',
      三合: '三合の組み合わせで、調和します。',
      比和: '地支が同じで、互いに理解しやすい。',
      无关: '特段の生剋はなく、それぞれ独立。',
      刑: '地支相刑、ここに小さな摩擦が。',
      害: '地支相害、忍耐が求められます。',
      冲: '地支相沖、リズムの違いは挑戦であり補完でもあります。',
    },
    harmonious: '初判：相性良好 — 複数の軸で自然に合います。',
    neutral: '初判：穏やか — 合うところもあれば、それぞれの距離も。',
    friction: '初判：要調整 — リズムの差は対話で和らぎます。',
    yearMissing: '双方の生年を入力すると、八字の初判が表示されます。',
  },
  en: {
    title: 'First reading',
    zodiacLine: {
      合: 'A harmonious zodiac match — an easy, warm rapport.',
      冲: 'A clashing zodiac pair — a little patience smooths it over.',
      平: 'A neutral zodiac pairing — comfortable as it is.',
    },
    dayMasterLabel: 'Day master',
    yearBranchLabel: 'Year branch',
    monthBranchLabel: 'Month branch',
    dayBranchLabel: 'Day branch',
    wuxingName: {
      相生: 'generates',
      被生: 'generated by',
      比和: 'same element',
      相克: 'restrains',
      被克: 'restrained by',
    },
    branchName: {
      六合: 'harmony',
      三合: 'trine',
      比和: 'same',
      无关: 'neutral',
      刑: 'punish',
      害: 'harm',
      冲: 'clash',
    },
    dayMasterLine: {
      相生: 'Your day master nourishes theirs — an easy, supportive flow.',
      被生: 'Their day master nourishes yours — a cared-for feeling.',
      比和: 'Same day-master element — like-minded, on the same wavelength.',
      相克: 'Your day master restrains theirs — a little forbearance helps.',
      被克: 'Their day master restrains yours — communication matters.',
    },
    branchLine: {
      六合: 'Six-harmony branches — natural rapport.',
      三合: 'Same trine group — harmonious, shared goals.',
      比和: 'Matching branches — easily understood.',
      无关: 'No special branch link — each independent.',
      刑: 'Punishment branches — friction here, softened by understanding.',
      害: 'Harming branches — quiet friction, needs patience.',
      冲: 'Clashing branches — different rhythms; a challenge and a complement.',
    },
    harmonious: 'First reading: a good fit — several dimensions align naturally.',
    neutral: 'First reading: balanced — some alignment, some space; go with the flow.',
    friction: 'First reading: needs tending — different rhythms; communication smooths it.',
    yearMissing: 'Add both full birth years to compute the 八字 first reading.',
  },
}

/**
 * 「黄历原声」文言 copy set (zh only) — the same structure, the almanac's voice:
 * 合参/相生相克/六合三合 as 命理行话, verdicts as 合参曰 statements. Cultural
 * reference register — same non-prediction posture as the contemporary copy.
 */
const LC: Record<'zh-Hans' | 'zh-Hant', PrelimCopy> = {
  'zh-Hans': {
    title: '八字合参',
    zodiacLine: {
      合: '生肖相合，气类相投。',
      冲: '生肖相冲，宜以让化之。',
      平: '生肖平和，各安其分。',
    },
    dayMasterLabel: '日主',
    yearBranchLabel: '年支',
    monthBranchLabel: '月支',
    dayBranchLabel: '日支',
    wuxingName: { 相生: '相生', 被生: '被生', 比和: '比和', 相克: '相克', 被克: '被克' },
    branchName: {
      六合: '六合',
      三合: '三合',
      比和: '比和',
      无关: '无关',
      刑: '相刑',
      害: '相害',
      冲: '相冲',
    },
    dayMasterLine: {
      相生: '尔之生彼，气脉相承。',
      被生: '彼之生尔，如沐春晖。',
      比和: '日主比和，声气相通。',
      相克: '尔克于彼，宜以容化之。',
      被克: '彼克于尔，宜以言和之。',
    },
    branchLine: {
      六合: '六合相得，天作之合。',
      三合: '三合成局，同气连枝。',
      比和: '支同气合，两心相印。',
      无关: '各安其位，无所拘牵。',
      刑: '相刑之地，宜慎其行。',
      害: '相害之形，宜徐图之。',
      冲: '相冲之势，亦冲亦合。',
    },
    harmonious: '合参曰：诸柱相合，气脉相生，相契也。',
    neutral: '合参曰：有合有冲，两不相胜，平和也。',
    friction: '合参曰：冲刑并见，宜以静化之，磨合也。',
    yearMissing: '补全生年，方可合参八字。',
  },
  'zh-Hant': {
    title: '八字合參',
    zodiacLine: {
      合: '生肖相合，氣類相投。',
      冲: '生肖相沖，宜以讓化之。',
      平: '生肖平和，各安其分。',
    },
    dayMasterLabel: '日主',
    yearBranchLabel: '年支',
    monthBranchLabel: '月支',
    dayBranchLabel: '日支',
    wuxingName: { 相生: '相生', 被生: '被生', 比和: '比和', 相克: '相剋', 被克: '被剋' },
    branchName: {
      六合: '六合',
      三合: '三合',
      比和: '比和',
      无关: '無關',
      刑: '相刑',
      害: '相害',
      冲: '相沖',
    },
    dayMasterLine: {
      相生: '爾之生彼，氣脈相承。',
      被生: '彼之生爾，如沐春暉。',
      比和: '日主比和，聲氣相通。',
      相克: '爾剋於彼，宜以容化之。',
      被克: '彼剋於爾，宜以言和之。',
    },
    branchLine: {
      六合: '六合相得，天作之合。',
      三合: '三合成局，同氣連枝。',
      比和: '支同氣合，兩心相印。',
      无关: '各安其位，無所拘牽。',
      刑: '相刑之地，宜慎其行。',
      害: '相害之形，宜徐圖之。',
      冲: '相沖之勢，亦沖亦合。',
    },
    harmonious: '合參曰：諸柱相合，氣脈相生，相契也。',
    neutral: '合參曰：有合有沖，兩不相勝，平和也。',
    friction: '合參曰：沖刑並見，宜以靜化之，磨合也。',
    yearMissing: '補全生年，方可合參八字。',
  },
}

/** Solar YYYY-MM-DD for the person, or null when the 八字 can't be derived
 *  (sentinel year 0000, or a 农历 date without a usable year). */
function personSolarDate(person: AuspicePerson): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(person.solarDate)
  if (!m) return null
  const year = Number(m[1])
  if (year < 1900) return null
  if (person.calendar === 'lunar') {
    try {
      const s = lunarToSolar(year, Number(m[2]), Number(m[3]), person.lunarIsLeap === true)
      const p = (n: number) => String(n).padStart(2, '0')
      return `${s.getFullYear()}-${p(s.getMonth() + 1)}-${p(s.getDate())}`
    } catch {
      return null
    }
  }
  return person.solarDate
}

/** One person's time inputs — 时辰 wheel, or precise clock + city for 真太阳时. */
interface BirthTimeInput {
  dateStr: string
  timeIndex?: number | null
  clockMinutes?: number | null
  calibrate?: boolean | null
  longitude?: number | null
  timezone?: string | null
  city?: string
}

/**
 * 四柱 for one person, with the hour resolved the SAME way the chart engine
 * does (`resolveBirthHour`): a precise clock (+ optional 真太阳时 calibration,
 * which may shift the calendar date) when present, else the 时辰 midpoint.
 */
function pillarsFor(input: BirthTimeInput) {
  const parts = input.dateStr.split('-').map((n) => Number(n))
  const year = parts[0] ?? 1900
  const month = parts[1] ?? 1
  const day = parts[2] ?? 1
  const r = resolveBirthHour({
    year,
    month,
    day,
    timeIndex: input.timeIndex ?? undefined,
    clockMinutes: input.clockMinutes ?? undefined,
    calibrate: input.calibrate ?? undefined,
    longitude: input.longitude ?? undefined,
    timezoneId: input.timezone ?? undefined,
    city: input.city || undefined,
  })
  return getFourPillars({ year: r.year, month: r.month, day: r.day, hour: r.hour })
}

interface BaziSignals {
  wuxing: WuXingRelation
  branches: [BranchRelation, BranchRelation, BranchRelation] // 年支 / 月支 / 日支
}

function baziSignals(self: AuspiceBirthInfo, other: AuspicePerson): BaziSignals | null {
  const otherDate = personSolarDate(other)
  if (!otherDate || !self.solarDate) return null
  const a = pillarsFor({
    dateStr: self.solarDate,
    timeIndex: self.timeIndex,
    clockMinutes: self.clockMinutes,
    calibrate: self.calibrate,
    longitude: self.lng,
    timezone: self.timezone,
    city: self.city,
  })
  const b = pillarsFor({
    dateStr: otherDate,
    timeIndex: other.timeIndex,
    clockMinutes: other.clockMinutes,
    calibrate: other.calibrate,
    longitude: other.lng,
    timezone: other.timezone,
    city: other.city,
  })
  return {
    wuxing: getWuXingRelation(STEM_WUXING[a.day.stem], STEM_WUXING[b.day.stem]),
    branches: [
      getBranchRelation(a.year.branch, b.year.branch),
      getBranchRelation(a.month.branch, b.month.branch),
      getBranchRelation(a.day.branch, b.day.branch),
    ],
  }
}

/** Soft aggregate — 八字 dimensions are read as cultural signals, NOT scored
 *  (no numeric 配对指数 in Yuun: a love-score reads as prediction, which is
 *  outside the Reference-category posture). */
function aggregate(s: BaziSignals): 'harmonious' | 'neutral' | 'friction' {
  const wuxingScore: Record<WuXingRelation, number> = {
    相生: 2,
    被生: 2,
    比和: 1,
    相克: -2,
    被克: -2,
  }
  const branchScore: Record<BranchRelation, number> = {
    六合: 2,
    三合: 2,
    比和: 1,
    无关: 0,
    刑: -1,
    害: -2,
    冲: -2,
  }
  let score = wuxingScore[s.wuxing]
  for (const b of s.branches) score += branchScore[b]
  if (score >= 3) return 'harmonious'
  if (score <= -3) return 'friction'
  return 'neutral'
}

function verdictColor(v: RelVerdict, colors: ReturnType<typeof useTheme>['colors']): string {
  return v === '合' ? colors.success : v === '冲' ? colors.danger : colors.secondary
}

export function BaziPreliminarySheet({
  visible,
  onClose,
  self,
  person,
}: {
  visible: boolean
  onClose: () => void
  self: AuspiceBirthInfo | null
  person: AuspicePerson | null
}) {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
  const { classical } = useVoiceMode()
  // 「黄历原声」 — zh classical register swaps in the 文言 copy set.
  const l =
    classical && (locale === 'zh-Hans' || locale === 'zh-Hant')
      ? LC[locale === 'zh-Hant' ? 'zh-Hant' : 'zh-Hans']
      : L[locale]

  const rel = useMemo(
    () => (self?.solarDate && person ? relationship(self.solarDate, person.solarDate) : null),
    [self, person]
  )
  const signals = useMemo(
    () => (self?.solarDate && person ? baziSignals(self, person) : null),
    [self, person]
  )
  const verdict = signals ? aggregate(signals) : null

  return (
    <SatelliteBottomSheet visible={visible} onClose={onClose} title={l.title}>
      <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.lg }}>
        {rel ? (
          <>
            {/* 生肖 verdict — always available when years are known. */}
            <View style={{ alignItems: 'center', gap: spacing.sm }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  borderWidth: 1,
                  borderColor: verdictColor(rel.verdict, colors),
                  backgroundColor: colors.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <RelationshipSeal
                  verdict={rel.verdict}
                  size={40}
                  color={verdictColor(rel.verdict, colors)}
                />
              </View>
              <Text style={{ color: colors.secondary, fontSize: 12, letterSpacing: 2 }}>
                {rel.selfAnimal} · {person?.name ?? ''} {rel.otherAnimal}
              </Text>
              <Text
                style={{ color: colors.text, fontSize: 14, lineHeight: 22, textAlign: 'center' }}
              >
                {l.zodiacLine[rel.verdict]}
              </Text>
            </View>

            {signals && verdict ? (
              <>
                <Row
                  label={l.dayMasterLabel}
                  name={l.wuxingName[signals.wuxing]}
                  line={l.dayMasterLine[signals.wuxing]}
                  colors={colors}
                  spacing={spacing}
                />
                <Row
                  label={l.yearBranchLabel}
                  name={l.branchName[signals.branches[0]]}
                  line={l.branchLine[signals.branches[0]]}
                  colors={colors}
                  spacing={spacing}
                />
                <Row
                  label={l.monthBranchLabel}
                  name={l.branchName[signals.branches[1]]}
                  line={l.branchLine[signals.branches[1]]}
                  colors={colors}
                  spacing={spacing}
                />
                <Row
                  label={l.dayBranchLabel}
                  name={l.branchName[signals.branches[2]]}
                  line={l.branchLine[signals.branches[2]]}
                  colors={colors}
                  spacing={spacing}
                />

                <Text
                  style={{ color: colors.accent, fontSize: 14, fontWeight: '600', lineHeight: 22 }}
                >
                  {verdict === 'harmonious'
                    ? l.harmonious
                    : verdict === 'friction'
                      ? l.friction
                      : l.neutral}
                </Text>
              </>
            ) : (
              <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 20 }}>
                {l.yearMissing}
              </Text>
            )}
          </>
        ) : (
          <Text style={{ color: colors.secondary, fontSize: 14 }}>{t.people.needBirthBody}</Text>
        )}

        <Text
          style={{ color: colors.secondary, fontSize: 11, lineHeight: 16, textAlign: 'center' }}
        >
          {t.legalDisclaimerShort}
        </Text>
      </View>
    </SatelliteBottomSheet>
  )
}

function Row({
  label,
  name,
  line,
  colors,
  spacing,
}: {
  label: string
  name: string
  line: string
  colors: ReturnType<typeof useTheme>['colors']
  spacing: ReturnType<typeof useTheme>['spacing']
}) {
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text style={{ color: colors.dim, fontSize: 12, letterSpacing: 2 }}>{label}</Text>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 999,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.separator,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>{name}</Text>
        </View>
      </View>
      <Text style={{ color: colors.text, fontSize: 13, lineHeight: 20 }}>{line}</Text>
    </View>
  )
}
