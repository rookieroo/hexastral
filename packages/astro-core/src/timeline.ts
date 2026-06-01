/**
 * @zhop/astro-core — 命运时间轴节点引擎 (Fate Timeline Nodes)
 *
 * 在 `dayun.ts` 的原始大运/流年序列之上加一层"分析层":
 *   - 每个节点天干对日主的十神关系
 *   - 节点地支是否冲日支(本命)
 *   - 显著度评级 (major / notable / routine)
 *   - 提前推送的触发日期 (大运提前半年+一月; 显著流年提前一月)
 *
 * 这是 fate 订阅价值的**确定性内核** (ADR-0012):免费层即可见节点 + 预设文案;
 * LLM 深度解读是其上的付费增值层 (svc-astro, 受 K.4 guard 限流)。
 * 设计上只把 **大运 / 显著流年** 列为推送节点 —— 不推流月,避免与 Cycle 的
 * 每日节律相撞 (流月留作时间轴里的明细,不主动 push)。
 *
 * 日期全部按 UTC 计算,保证 golden 测试与机器时区无关。
 */

import { calculateDaYun, type DaYunResult, type DaYunStep, type Gender, getLiuNian } from './dayun'
import { getJieQiDay } from './jieqi'
import { getShiShen, type ShiShenInfo } from './shishen'
import type { DateTimeInput, EarthlyBranch, GanZhi, HeavenlyStem } from './types'

export type TimelineNodeType = '大运' | '流年'
export type NodeSignificance = 'major' | 'notable' | 'routine'

export interface TimelineNode {
  type: TimelineNodeType
  /** 公历年 (大运: 换运起始年; 流年: 当年). */
  year: number
  /** 节点近似生效日期 ISO `YYYY-MM-DD` (大运: 当年生日; 流年: 当年立春). */
  effectiveDate: string
  ganZhi: GanZhi
  /** 节点天干对日主的十神. */
  shiShen: ShiShenInfo
  /** 节点地支是否冲日支(本命). */
  clashesDayBranch: boolean
  significance: NodeSignificance
  /** 一句话定性 (确定性, 无 LLM). */
  summary: string
}

export interface TimelineNotification {
  node: TimelineNode
  /** 推送日期 ISO `YYYY-MM-DD` = effectiveDate − leadDays. */
  fireDate: string
  leadDays: number
  /** '半年' | '一个月'. */
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

/** 流年十神 → 预设定性提示 (免费层文案). */
const SHISHEN_YEAR_HINT: Record<string, string> = {
  比肩: '同辈助力，宜协作',
  劫财: '竞争耗财，谨慎合伙',
  食神: '才华舒展，享福之年',
  伤官: '锋芒外露，宜守口慎言',
  偏财: '机遇财来，把握时机',
  正财: '稳健进财，务实为上',
  七杀: '压力与突破并存',
  正官: '责任与机遇，宜进取',
  偏印: '思虑偏多，宜静养充电',
  正印: '贵人学业，受庇护之年',
}

/** 值得提醒的十神类别. */
const NOTABLE_SHISHEN = new Set<string>(['七杀', '伤官', '正官', '正财', '正印'])

const DAY_MS = 86_400_000

/** 立春 (jie index 2) 的 UTC 毫秒时间戳. */
function liChunUtcMs(year: number): number {
  // dayun.ts 约定: jieIdx=2 → 立春, 落在 2 月 (month index 1).
  return Date.UTC(year, 1, getJieQiDay(year, 2))
}

function isoFromMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

function isoToUtcMs(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`)
}

function clashes(branch: EarthlyBranch, dayBranch: EarthlyBranch): boolean {
  return BRANCH_CLASH[branch] === dayBranch
}

/** 单个流年节点. */
function annotateLiuNian(
  dayMaster: HeavenlyStem,
  dayBranch: EarthlyBranch,
  year: number
): TimelineNode {
  const ganZhi = getLiuNian(year)
  const shiShen = getShiShen(dayMaster, ganZhi.stem)
  const clashesDayBranch = clashes(ganZhi.branch, dayBranch)
  const significance: NodeSignificance =
    clashesDayBranch || NOTABLE_SHISHEN.has(shiShen.name) ? 'notable' : 'routine'
  const hint = SHISHEN_YEAR_HINT[shiShen.name] ?? ''
  const summary = clashesDayBranch
    ? `${year}年 ${ganZhi.label}（${shiShen.name}年），流年冲日支，主变动。`
    : `${year}年 ${ganZhi.label}（${shiShen.name}年）${hint ? `，${hint}` : ''}。`
  return {
    type: '流年',
    year,
    effectiveDate: isoFromMs(liChunUtcMs(year)),
    ganZhi,
    shiShen,
    clashesDayBranch,
    significance,
    summary,
  }
}

/** 单个大运换运节点 (人生阶段转换, 始终 major). */
function annotateDaYun(
  dayMaster: HeavenlyStem,
  dayBranch: EarthlyBranch,
  step: DaYunStep,
  birthMonth: number,
  birthDay: number
): TimelineNode {
  const ganZhi = step.ganZhi
  const shiShen = getShiShen(dayMaster, ganZhi.stem)
  return {
    type: '大运',
    year: step.startYear,
    effectiveDate: isoFromMs(Date.UTC(step.startYear, birthMonth - 1, birthDay)),
    ganZhi,
    shiShen,
    clashesDayBranch: clashes(ganZhi.branch, dayBranch),
    significance: 'major',
    summary: `进入「${ganZhi.label}」大运（${shiShen.name}运，${step.startAge}–${step.endAge}岁），人生阶段转换。`,
  }
}

export interface TimelineNodesOptions {
  /** 起始公历年(含). 默认 = 出生年. */
  fromYear?: number
  /** 结束公历年(含). 默认 = 出生年 + 90. */
  toYear?: number
}

/** 全量节点 (大运换运 + 逐年流年), 已标注 + 评级, 按年份升序 (同年大运在流年前). */
export function getTimelineNodes(
  input: DateTimeInput,
  gender: Gender,
  opts: TimelineNodesOptions = {}
): { daYun: DaYunResult; nodes: TimelineNode[] } {
  const daYun = calculateDaYun(input, gender)
  const dayMaster = daYun.pillars.day.stem
  const dayBranch = daYun.pillars.day.branch
  const fromYear = opts.fromYear ?? input.year
  const toYear = opts.toYear ?? input.year + 90

  const nodes: TimelineNode[] = []

  for (const step of daYun.steps) {
    if (step.startYear >= fromYear && step.startYear <= toYear) {
      nodes.push(annotateDaYun(dayMaster, dayBranch, step, input.month, input.day))
    }
  }
  for (let y = fromYear; y <= toYear; y++) {
    nodes.push(annotateLiuNian(dayMaster, dayBranch, y))
  }

  nodes.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    if (a.type === b.type) return 0
    return a.type === '大运' ? -1 : 1
  })

  return { daYun, nodes }
}

const LEADS: ReadonlyArray<{ days: number; label: string }> = [
  { days: 182, label: '半年' },
  { days: 30, label: '一个月' },
]

export interface NotificationOptions {
  /** 计算推送的起点 (默认现在). */
  fromDate?: Date
  /** 推送窗口天数 (默认 400, 覆盖未来一年余). */
  withinDays?: number
}

/**
 * 未来窗口内的提前推送列表 (只针对 大运 + 显著流年)。
 * 大运: 提前半年 + 一个月两次; 显著流年: 提前一个月一次; routine 流年: 不推。
 */
export function getTimelineNotifications(
  input: DateTimeInput,
  gender: Gender,
  opts: NotificationOptions = {}
): TimelineNotification[] {
  const fromMs = (opts.fromDate ?? new Date()).getTime()
  const withinDays = opts.withinDays ?? 400
  const windowEndMs = fromMs + withinDays * DAY_MS
  const fromYear = new Date(fromMs).getUTCFullYear()
  const toYear = new Date(windowEndMs).getUTCFullYear() + 1

  const { nodes } = getTimelineNodes(input, gender, { fromYear, toYear })
  const out: TimelineNotification[] = []

  for (const node of nodes) {
    if (node.significance === 'routine') continue
    const effectiveMs = isoToUtcMs(node.effectiveDate)
    // 大运提前半年+一月; 流年只提前一月.
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

  out.sort((a, b) => (a.fireDate < b.fireDate ? -1 : a.fireDate > b.fireDate ? 1 : 0))
  return out
}
