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
  composeBondsTimeline,
  type ComposeBondsTimelineOptions,
  type DateTimeInput,
  type RelationshipPerson,
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
}

/** pairReadings 行里与排盘相关的双方字段 (resonance 解析用)。 */
export interface PairReadingBirth {
  personASolarDate: string
  personATimeIndex: number
  personAGender: string
  personBSolarDate: string
  personBTimeIndex: number
  personBGender: string
}

/** 隐私投影后的时间轴节点 DTO —— 只含派生字段, 无原始生辰。 */
export interface BondsTimelineNodeDTO {
  key: string
  /** 生效日期 ISO `YYYY-MM-DD`. */
  date: string
  year: number
  kind: '大运' | '流年'
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
  kind: '大运' | '流年'
  significance: 'major' | 'notable' | 'routine'
  summary: string
}

export interface BondsTimelineDTO {
  nodes: BondsTimelineNodeDTO[]
  notifications: BondsTimelineNotificationDTO[]
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

/** 把 astro-core 合并结果投影为隐私安全 DTO (剥离 per-bond 原始节点)。 */
export function projectBondsTimeline(composed: {
  nodes: ReturnType<typeof composeBondsTimeline>['nodes']
  notifications: ReturnType<typeof composeBondsTimeline>['notifications']
}): BondsTimelineDTO {
  const nodes: BondsTimelineNodeDTO[] = composed.nodes.map((n) => ({
    key: n.key,
    date: n.date,
    year: n.year,
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
  }))
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

/**
 * 本我 + 已解析 bonds → 隐私安全时间轴 DTO。纯函数。
 * 生辰非法的 bond 自动跳过 (flatMap 滤除)。本我生辰非法 → 空轴 (路由应先校验)。
 */
export function buildEgoTimeline(
  egoBirth: BirthTriple,
  bonds: ResolvedBond[],
  opts: ComposeBondsTimelineOptions = {}
): BondsTimelineDTO {
  const egoInput = birthToInput(egoBirth)
  if (!egoInput) return { nodes: [], notifications: [] }
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
      },
    ]
  })

  return projectBondsTimeline(composeBondsTimeline(ego, bondInputs, opts))
}
