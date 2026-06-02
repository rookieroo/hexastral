/**
 * @zhop/astro-core — 关系命运时间轴 (Relationship Timeline, Kindred B-yuan.1)
 *
 * fate 的 `timeline.ts` 是单人(命主)的;这是**双人(关系)**版:
 *   - 逐年流年对 **双方日主** 的十神 + 流年支与 **双方日支** 的 冲(六冲)/合(六合)
 *   - **任一方** 的大运换运 = 关系节奏转换 (major)
 *   - 提前推送同 fate (大运 半年+一月; 显著流年 一月; 流月不推)
 *
 * 复用 `getLiuNian` / `getShiShen` / `calculateDaYun`,不依赖静态合婚分(那是另一回事)。
 * 与 fate `timeline.ts` 保持独立(不改其已测代码),小段调度逻辑刻意自带一份。
 * 纪念日(关系起始日)属纯日期循环,交给 app 侧排程,不在此引擎。
 * 日期全部 UTC,保证 golden 测试与时区无关。A = 用户,B = 对方。
 */

import { calculateDaYun, type DaYunStep, type Gender, getLiuNian } from './dayun'
import { getJieQiDay } from './jieqi'
import { getShiShen, type ShiShenInfo } from './shishen'
import type { DateTimeInput, EarthlyBranch, GanZhi, HeavenlyStem } from './types'

export interface RelationshipPerson {
  input: DateTimeInput
  gender: Gender
}

export type RelTimelineNodeType = '大运' | '流年'
export type RelNodeSignificance = 'major' | 'notable' | 'routine'

export interface RelationshipTimelineNode {
  type: RelTimelineNodeType
  year: number
  effectiveDate: string
  ganZhi: GanZhi
  /** 大运 节点: 谁的大运换运 (A=用户 / B=对方). */
  daYunOf?: 'A' | 'B'
  /** 流年 节点: 该年天干对双方日主的十神. */
  shiShenA?: ShiShenInfo
  shiShenB?: ShiShenInfo
  /** 流年支 冲 A / B 日支 (六冲). */
  clashA: boolean
  clashB: boolean
  /** 流年支 合 A / B 日支 (六合). */
  harmonyA: boolean
  harmonyB: boolean
  significance: RelNodeSignificance
  summary: string
}

export interface RelTimelineNotification {
  node: RelationshipTimelineNode
  fireDate: string
  leadDays: number
  leadLabel: string
}

/** 地支六冲 */
const BRANCH_CLASH: Record<EarthlyBranch, EarthlyBranch> = {
  子: '午',
  午: '子',
  丑: '未',
  未: '丑',
  寅: '申',
  申: '寅',
  卯: '酉',
  酉: '卯',
  辰: '戌',
  戌: '辰',
  巳: '亥',
  亥: '巳',
}

/** 地支六合 (子丑 / 寅亥 / 卯戌 / 辰酉 / 巳申 / 午未) */
const BRANCH_COMBINE: Record<EarthlyBranch, EarthlyBranch> = {
  子: '丑',
  丑: '子',
  寅: '亥',
  亥: '寅',
  卯: '戌',
  戌: '卯',
  辰: '酉',
  酉: '辰',
  巳: '申',
  申: '巳',
  午: '未',
  未: '午',
}

const DAY_MS = 86_400_000

function liChunUtcMs(year: number): number {
  return Date.UTC(year, 1, getJieQiDay(year, 2)) // jieIdx 2 = 立春 (2 月)
}
function isoFromMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}
function isoToUtcMs(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`)
}

interface ChartFacts {
  dayMaster: HeavenlyStem
  dayBranch: EarthlyBranch
  steps: DaYunStep[]
  birthMonth: number
  birthDay: number
}

function chartFacts(person: RelationshipPerson): ChartFacts {
  const dy = calculateDaYun(person.input, person.gender)
  return {
    dayMaster: dy.pillars.day.stem,
    dayBranch: dy.pillars.day.branch,
    steps: dy.steps,
    birthMonth: person.input.month,
    birthDay: person.input.day,
  }
}

function annotateLiuNian(year: number, a: ChartFacts, b: ChartFacts): RelationshipTimelineNode {
  const ganZhi = getLiuNian(year)
  const shiShenA = getShiShen(a.dayMaster, ganZhi.stem)
  const shiShenB = getShiShen(b.dayMaster, ganZhi.stem)
  const clashA = BRANCH_CLASH[ganZhi.branch] === a.dayBranch
  const clashB = BRANCH_CLASH[ganZhi.branch] === b.dayBranch
  const harmonyA = BRANCH_COMBINE[ganZhi.branch] === a.dayBranch
  const harmonyB = BRANCH_COMBINE[ganZhi.branch] === b.dayBranch

  const anyClash = clashA || clashB
  const anyHarmony = harmonyA || harmonyB
  const significance: RelNodeSignificance = anyClash || anyHarmony ? 'notable' : 'routine'

  let summary: string
  if (anyClash) {
    const who = clashA && clashB ? '双方' : clashA ? '你' : '对方'
    summary = `${year}年 ${ganZhi.label}，流年冲${who}日支，关系易起波动，宜多沟通。`
  } else if (anyHarmony) {
    const who = harmonyA && harmonyB ? '双方' : harmonyA ? '你' : '对方'
    summary = `${year}年 ${ganZhi.label}，流年合${who}日支，关系和顺，宜推进。`
  } else {
    summary = `${year}年 ${ganZhi.label}，关系平稳。`
  }

  return {
    type: '流年',
    year,
    effectiveDate: isoFromMs(liChunUtcMs(year)),
    ganZhi,
    shiShenA,
    shiShenB,
    clashA,
    clashB,
    harmonyA,
    harmonyB,
    significance,
    summary,
  }
}

function annotateDaYun(
  step: DaYunStep,
  facts: ChartFacts,
  who: 'A' | 'B'
): RelationshipTimelineNode {
  const ganZhi = step.ganZhi
  const label = who === 'A' ? '你' : '对方'
  return {
    type: '大运',
    year: step.startYear,
    effectiveDate: isoFromMs(Date.UTC(step.startYear, facts.birthMonth - 1, facts.birthDay)),
    ganZhi,
    daYunOf: who,
    clashA: BRANCH_CLASH[ganZhi.branch] === facts.dayBranch && who === 'A',
    clashB: BRANCH_CLASH[ganZhi.branch] === facts.dayBranch && who === 'B',
    harmonyA: false,
    harmonyB: false,
    significance: 'major',
    summary: `${label}进入「${ganZhi.label}」大运（${step.startAge}–${step.endAge}岁），关系节奏将随之转换。`,
  }
}

export interface RelTimelineNodesOptions {
  fromYear?: number
  toYear?: number
}

/**
 * 关系时间轴节点 (双方大运换运 + 逐年流年关系互动), 已标注+评级, 按年份升序。
 * 默认范围: max(两人出生年) .. +90。
 */
export function getRelationshipTimelineNodes(
  personA: RelationshipPerson,
  personB: RelationshipPerson,
  opts: RelTimelineNodesOptions = {}
): { nodes: RelationshipTimelineNode[] } {
  const a = chartFacts(personA)
  const b = chartFacts(personB)
  const fromYear = opts.fromYear ?? Math.max(personA.input.year, personB.input.year)
  const toYear = opts.toYear ?? Math.max(personA.input.year, personB.input.year) + 90

  const nodes: RelationshipTimelineNode[] = []

  for (const step of a.steps) {
    if (step.startYear >= fromYear && step.startYear <= toYear) {
      nodes.push(annotateDaYun(step, a, 'A'))
    }
  }
  for (const step of b.steps) {
    if (step.startYear >= fromYear && step.startYear <= toYear) {
      nodes.push(annotateDaYun(step, b, 'B'))
    }
  }
  for (let y = fromYear; y <= toYear; y++) {
    nodes.push(annotateLiuNian(y, a, b))
  }

  nodes.sort((x, y) => {
    if (x.year !== y.year) return x.year - y.year
    if (x.type === y.type) return 0
    return x.type === '大运' ? -1 : 1
  })

  return { nodes }
}

const LEADS: ReadonlyArray<{ days: number; label: string }> = [
  { days: 182, label: '半年' },
  { days: 30, label: '一个月' },
]

export interface RelNotificationOptions {
  fromDate?: Date
  withinDays?: number
}

/** 未来窗口内的提前推送 (大运 半年+一月; 显著流年 一月; routine 不推)。 */
export function getRelationshipTimelineNotifications(
  personA: RelationshipPerson,
  personB: RelationshipPerson,
  opts: RelNotificationOptions = {}
): RelTimelineNotification[] {
  const fromMs = (opts.fromDate ?? new Date()).getTime()
  const withinDays = opts.withinDays ?? 400
  const windowEndMs = fromMs + withinDays * DAY_MS
  const fromYear = new Date(fromMs).getUTCFullYear()
  const toYear = new Date(windowEndMs).getUTCFullYear() + 1

  const { nodes } = getRelationshipTimelineNodes(personA, personB, { fromYear, toYear })
  const out: RelTimelineNotification[] = []

  for (const node of nodes) {
    if (node.significance === 'routine') continue
    const effectiveMs = isoToUtcMs(node.effectiveDate)
    const leads = node.type === '大运' ? LEADS : LEADS.slice(1)
    for (const lead of leads) {
      const fireMs = effectiveMs - lead.days * DAY_MS
      if (fireMs >= fromMs && fireMs <= windowEndMs) {
        out.push({
          node,
          fireDate: isoFromMs(fireMs),
          leadDays: lead.days,
          leadLabel: lead.label,
        })
      }
    }
  }

  out.sort((x, y) => (x.fireDate < y.fireDate ? -1 : x.fireDate > y.fireDate ? 1 : 0))
  return out
}
