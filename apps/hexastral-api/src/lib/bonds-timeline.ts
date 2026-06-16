/**
 * 本我中心多关系时间轴 — 服务端合并与隐私投影 (BT.3, ADR-0014)
 *
 * 纯函数层 (无 DB)：把本我 + 已解析的 bonds 喂给 astro-core `composeBondsTimeline`,
 * 再投影成**只含派生字段**的 DTO。承重的隐私不变量 (D2):
 *   响应**绝不**含对方原始 date/time —— 投影白名单里没有 solarDate/timeIndex,
 *   `RelationshipTimelineNode` 本身也只有派生事实 (干支/十神/冲合), 无原始生辰。
 *
 * resonance bond 的对方原始盘只在服务端可读; 此层把它折叠成派生节点后即丢弃。
 */

import {
  type BondInput,
  type ComposeBondsLiuYueOptions,
  type ComposeBondsTimelineOptions,
  composeBondsLiuYue,
  composeBondsTimeline,
  type DateTimeInput,
  type MergedNode,
  type RelationshipPerson,
  type ZiweiTimingSummary,
} from '@zhop/astro-core'

/** 生辰三元组 (排盘最小输入)。 */
export interface BirthTriple {
  solarDate: string
  timeIndex: number
  gender: '男' | '女'
}

/** 已解析对方生辰的 bond (路由从 DB 按模式取好后传入)。 */
export interface ResolvedBond {
  bondId: string
  name: string
  relationshipLabel?: string
  counterpart: BirthTriple
  /** 对方的紫微时序摘要 (来自已存合盘报告; 仅 resonance 且已生成报告的 bond 有)。 */
  counterpartZiwei?: ZiweiTimingSummary
}

/** pairReadings 行里与排盘相关的双方字段 (resonance 解析用)。 */
export interface PairReadingBirth {
  personASolarDate: string
  personATimeIndex: number
  personAGender: string
  personBSolarDate: string
  personBTimeIndex: number
  personBGender: string
  /** 双方紫微摘要 JSON (可空)；存在时供 timeline / what-if 复用印证。 */
  ziweiSummaryA?: string | null
  ziweiSummaryB?: string | null
}

/** 安全解析存储的紫微摘要 → 仅取时序印证所需的 star→宫 映射 (ZiweiTimingSummary)。 */
export function parseZiweiTimingSummary(
  raw: string | null | undefined
): ZiweiTimingSummary | undefined {
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw) as { starToPalace?: Record<string, string> }
    if (parsed && typeof parsed.starToPalace === 'object' && parsed.starToPalace) {
      return { starToPalace: parsed.starToPalace }
    }
  } catch {}
  return undefined
}

/** resonance reading 里本我是否为 personA (镜像 bond 时本我=personB)。 */
function egoIsPersonA(egoBirth: BirthTriple, reading: PairReadingBirth): boolean {
  return (
    reading.personASolarDate === egoBirth.solarDate &&
    reading.personATimeIndex === egoBirth.timeIndex &&
    reading.personAGender === egoBirth.gender
  )
}

/** 按本我视角拆分存储的双方紫微摘要 → { 本我, 对方 }。 */
export function resolveResonanceZiwei(
  egoBirth: BirthTriple,
  reading: PairReadingBirth
): { egoZiwei?: ZiweiTimingSummary; counterpartZiwei?: ZiweiTimingSummary } {
  const a = parseZiweiTimingSummary(reading.ziweiSummaryA)
  const b = parseZiweiTimingSummary(reading.ziweiSummaryB)
  return egoIsPersonA(egoBirth, reading)
    ? { egoZiwei: a, counterpartZiwei: b }
    : { egoZiwei: b, counterpartZiwei: a }
}

/** 隐私投影后的时间轴节点 DTO —— 只含派生字段, 无原始生辰。 */
export interface BondsTimelineNodeDTO {
  key: string
  /** 生效日期 ISO `YYYY-MM-DD`. */
  date: string
  year: number
  /** 流月节点: 公历月 1–12 (大运/流年 undefined)。 */
  month?: number
  kind: '大运' | '流年' | '流月'
  /** 干支名 (e.g. "甲子"), 仅 label, 非原始盘。 */
  ganZhi: string
  daYunOf?: 'A' | 'B'
  significance: 'major' | 'notable' | 'routine'
  summary: string
  /** 受影响关系: 仅 id/名/标签, 绝不含对方生辰。 */
  bonds: Array<{ bondId: string; name: string; relationshipLabel?: string }>
}

/** 隐私投影后的推送 DTO (客户端用 expo-notifications 排本地滚动窗口)。 */
export interface BondsTimelineNotificationDTO {
  /** 关联节点 key. */
  key: string
  fireDate: string
  leadDays: number
  leadLabel: string
  date: string
  year: number
  // 实际只会是 大运/流年 (流月不推); 与节点 kind 同并集以省去窄化 cast。
  kind: '大运' | '流年' | '流月'
  significance: 'major' | 'notable' | 'routine'
  summary: string
}

export interface BondsTimelineDTO {
  nodes: BondsTimelineNodeDTO[]
  notifications: BondsTimelineNotificationDTO[]
  /** 流月 living layer — 近期滚动窗口的月度明细 (可空; 大运/流年 轴之外的明细)。 */
  liuyue?: BondsTimelineNodeDTO[]
}

/** shichen timeIndex (0-12) → 代表性 24h 小时 (与 routes/bonds.ts 同约定)。 */
function timeIndexToHour(timeIndex: number): number {
  if (timeIndex === 0) return 0
  if (timeIndex === 12) return 23
  return timeIndex * 2 - 1
}

/** "YYYY-M-D" + timeIndex → DateTimeInput; 非法返回 null。 */
export function birthToInput(b: BirthTriple): DateTimeInput | null {
  const parts = b.solarDate.split('-')
  if (parts.length < 3) return null
  const year = Number.parseInt(parts[0]!, 10)
  const month = Number.parseInt(parts[1]!, 10)
  const day = Number.parseInt(parts[2]!, 10)
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return null
  return { year, month, day, hour: timeIndexToHour(b.timeIndex) }
}

/**
 * resonance bond 的对方 = pairReading 里**不是本我**的那一方。
 *
 * 不能假定对方恒为 personB: 镜像 bond (本我=应邀人) 里 personA=邀请人(对方)、personB=本我
 * (见 routes/bonds.ts respond handler 总把应邀人写为 personB)。故按本我生辰三元组比中
 * personA → 对方取 personB, 否则取 personA。
 */
export function resolveResonanceCounterpart(
  egoBirth: BirthTriple,
  reading: PairReadingBirth
): BirthTriple {
  const egoIsA =
    reading.personASolarDate === egoBirth.solarDate &&
    reading.personATimeIndex === egoBirth.timeIndex &&
    reading.personAGender === egoBirth.gender
  return egoIsA
    ? {
        solarDate: reading.personBSolarDate,
        timeIndex: reading.personBTimeIndex,
        gender: reading.personBGender as '男' | '女',
      }
    : {
        solarDate: reading.personASolarDate,
        timeIndex: reading.personATimeIndex,
        gender: reading.personAGender as '男' | '女',
      }
}

/** 单个合并节点 → 隐私安全 DTO (剥离 per-bond 原始节点, 只留 id/名/标签)。 */
function projectNode(n: MergedNode): BondsTimelineNodeDTO {
  return {
    key: n.key,
    date: n.date,
    year: n.year,
    month: n.month,
    kind: n.kind,
    ganZhi: n.ganZhi.label,
    daYunOf: n.daYunOf,
    significance: n.significance,
    summary: n.summary,
    bonds: n.bonds.map((b) => ({
      bondId: b.bondId,
      name: b.name,
      relationshipLabel: b.relationshipLabel,
    })),
  }
}

/** 把 astro-core 合并结果投影为隐私安全 DTO (剥离 per-bond 原始节点)。 */
export function projectBondsTimeline(composed: {
  nodes: ReturnType<typeof composeBondsTimeline>['nodes']
  notifications: ReturnType<typeof composeBondsTimeline>['notifications']
}): BondsTimelineDTO {
  const nodes: BondsTimelineNodeDTO[] = composed.nodes.map(projectNode)
  const notifications: BondsTimelineNotificationDTO[] = composed.notifications.map((nf) => ({
    key: nf.node.key,
    fireDate: nf.fireDate,
    leadDays: nf.leadDays,
    leadLabel: nf.leadLabel,
    date: nf.node.date,
    year: nf.node.year,
    kind: nf.node.kind,
    significance: nf.node.significance,
    summary: nf.node.summary,
  }))
  return { nodes, notifications }
}

/** 本我盘 + 已解析 bonds → astro-core 入参 (滤掉生辰非法者); 本我非法 → null。 */
function resolveEgoAndBonds(
  egoBirth: BirthTriple,
  bonds: ResolvedBond[]
): { ego: RelationshipPerson; bondInputs: BondInput[] } | null {
  const egoInput = birthToInput(egoBirth)
  if (!egoInput) return null
  const ego: RelationshipPerson = { input: egoInput, gender: egoBirth.gender }
  const bondInputs: BondInput[] = bonds.flatMap((b) => {
    const input = birthToInput(b.counterpart)
    if (!input) return []
    return [
      {
        input,
        gender: b.counterpart.gender,
        bondId: b.bondId,
        name: b.name,
        relationshipLabel: b.relationshipLabel,
        ziwei: b.counterpartZiwei,
      },
    ]
  })
  return { ego, bondInputs }
}

/**
 * 本我 + 已解析 bonds → 隐私安全时间轴 DTO。纯函数。
 * 生辰非法的 bond 自动跳过 (flatMap 滤除)。本我生辰非法 → 空轴 (路由应先校验)。
 */
export function buildEgoTimeline(
  egoBirth: BirthTriple,
  bonds: ResolvedBond[],
  opts: ComposeBondsTimelineOptions = {}
): BondsTimelineDTO {
  const resolved = resolveEgoAndBonds(egoBirth, bonds)
  if (!resolved) return { nodes: [], notifications: [] }
  return projectBondsTimeline(composeBondsTimeline(resolved.ego, resolved.bondInputs, opts))
}

/**
 * 本我 + 已解析 bonds → 隐私安全**流月** DTO 列表 (近期滚动窗口的月度明细)。纯函数。
 * 与生命轴正交、无推送。本我生辰非法 → 空。
 */
export function buildEgoLiuYue(
  egoBirth: BirthTriple,
  bonds: ResolvedBond[],
  opts: ComposeBondsLiuYueOptions = {}
): BondsTimelineNodeDTO[] {
  const resolved = resolveEgoAndBonds(egoBirth, bonds)
  if (!resolved) return []
  return composeBondsLiuYue(resolved.ego, resolved.bondInputs, opts).nodes.map(projectNode)
}
