/**
 * @zhop/astro-core — 本我中心的多关系时间轴 (Bonds Timeline, Kindred BT.1)
 *
 * 把本我(ego)与**全部** bonds 的关系节点叠在同一条时间轴上。这是 Kindred 的订阅护城河
 * (ADR-0014): 一条「本我日历」，主动提前推送跨全部关系的显著节点。
 *
 * 架构 (ADR-0014):
 *   - D1 两两扇出: 合并轴 = ⋃ 每个 bond 的 `getRelationshipTimelineNodes(ego, bond_i)`。
 *     命理 synastry 本质成对, 不做 N 体一次性 reading。
 *   - 共位合并: 同一逻辑事件去重 ——
 *       · 本我同年大运在 N 个 bond 里重复出现 → 去重成一条 (影响全部关系)。
 *       · 同年流年在 N 个 bond 里各算一次 → 合成一条 (列出受影响的关系)。
 *       · 对方大运是该 bond 独有 → 单独成条。
 *   - 显著度: major(大运) > notable(冲/合) > routine; 同日按受影响 bond 数降序。
 *   - 推送限额: 视图全展示, 唯**推送**套每用户上限 (默认 ≤1 条/周), 解决「N 个 bond 各自推会炸」。
 *
 * 不接单人 fate `getTimelineNodes` —— 关系引擎的大运节点已含本我大运的关系化表述,
 * 本命走势是 fate_pro 的货 (ADR-0014 §D1 / monetization §6 boundary)。
 * 日期全部 UTC, 保证 golden 测试与时区无关。ego = A, bond = B。
 */

import type { Gender } from './dayun'
import {
  getRelationshipLiuYueNodes,
  getRelationshipTimelineNodes,
  type RelationshipPerson,
  type RelationshipTimelineNode,
  type RelNodeSignificance,
  type RelTimelineNodeType,
} from './relationship-timeline'
import type { DateTimeInput, GanZhi } from './types'

/** 一个 bond 的入参: 生辰命格 + 标识。 */
export interface BondInput {
  input: DateTimeInput
  gender: Gender
  bondId: string
  /** 展示名 (本我视角对该关系人的称呼)。 */
  name: string
  /** 关系标签 e.g. spouse / partner / friend (可选, 透传给客户端)。 */
  relationshipLabel?: string
}

/** 合并节点里某个 bond 的具体贡献。 */
export interface MergedBondRef {
  bondId: string
  name: string
  relationshipLabel?: string
  /** 该 bond 对应的双人引擎原始节点 (含 冲/合/十神 明细)。 */
  node: RelationshipTimelineNode
}

/** 一条合并后的时间轴节点 (共位去重后的逻辑事件)。 */
export interface MergedNode {
  /** 稳定身份键 (LN:year / DY:A:year:gz / DY:B:bondId:year:gz)。 */
  key: string
  /** 生效日期 ISO `YYYY-MM-DD` (共位节点共享)。 */
  date: string
  year: number
  /** 流月节点: 公历月 1–12 (其余类型 undefined)。 */
  month?: number
  kind: RelTimelineNodeType
  ganZhi: GanZhi
  /** 大运节点: 谁换运 (A=本我 / B=对方)。 */
  daYunOf?: 'A' | 'B'
  /** 该节点的显著度 = 各 bond 贡献中的最高级。 */
  significance: RelNodeSignificance
  /** 此节点触及的关系 (流年: 受冲/合的关系; 本我大运: 全部关系; 对方大运: 该 bond)。 */
  bonds: MergedBondRef[]
  summary: string
}

export interface MergedNotification {
  node: MergedNode
  /** 推送日期 ISO `YYYY-MM-DD` = date − leadDays。 */
  fireDate: string
  leadDays: number
  /** '半年' | '一个月'。 */
  leadLabel: string
}

export interface ComposeBondsTimelineOptions {
  /** 节点起始公历年(含)。默认 = max(本我, 各 bond 出生年)。 */
  fromYear?: number
  /** 节点结束公历年(含)。默认 = 起始 + 90。 */
  toYear?: number
  /** 推送窗口起点 (默认现在)。 */
  notifyFromDate?: Date
  /** 推送窗口天数 (默认 400)。 */
  notifyWithinDays?: number
  /** 推送最小间隔天数 (默认 7 ≈ ≤1 条/周)。 */
  minGapDays?: number
  /** 推送窗口内最多条数 (可选, 月度 top-N 风格的硬上限)。 */
  maxNotifications?: number
}

const DAY_MS = 86_400_000
const LEADS: ReadonlyArray<{ days: number; label: string }> = [
  { days: 182, label: '半年' },
  { days: 30, label: '一个月' },
]

function isoToUtcMs(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`)
}

function sigRank(s: RelNodeSignificance): number {
  return s === 'major' ? 0 : s === 'notable' ? 1 : 2
}

function joinNames(bonds: MergedBondRef[]): string {
  return bonds.map((b) => b.name).join('、')
}

function mergedSummary(
  kind: RelTimelineNodeType,
  daYunOf: 'A' | 'B' | undefined,
  year: number,
  ganZhi: GanZhi,
  bonds: MergedBondRef[]
): string {
  const names = joinNames(bonds)
  if (kind === '大运') {
    if (daYunOf === 'A') {
      return `你进入「${ganZhi.label}」大运，与 ${names} 的关系节奏将随之转换。`
    }
    return `${names} 进入「${ganZhi.label}」大运，你们的关系节奏将随之转换。`
  }
  return `${year}年 ${ganZhi.label}，与 ${names} 的关系迎来显著节点。`
}

/**
 * 合并本我 × 全部 bonds 的关系时间轴。纯函数, 确定性。
 *
 * 步骤: 两两扇出 → 共位去重 → 显著度排序(同日) → 视图节点; 另算受限的推送计划。
 */
export function composeBondsTimeline(
  ego: RelationshipPerson,
  bonds: BondInput[],
  opts: ComposeBondsTimelineOptions = {}
): { nodes: MergedNode[]; notifications: MergedNotification[] } {
  // 单一共享年范围: 默认 = 全员都已出生那年起(各对的 max(ego,bond) 上界), +90。
  // 必须对每个 bond 用同一范围, 否则本我大运在不同 bond 里覆盖年份不一致, 去重会漏关系。
  const fromYear = opts.fromYear ?? Math.max(ego.input.year, ...bonds.map((b) => b.input.year))
  const toYear = opts.toYear ?? fromYear + 90

  // 共位累积器: key → 半成品合并节点。
  const acc = new Map<
    string,
    {
      date: string
      year: number
      kind: RelTimelineNodeType
      ganZhi: GanZhi
      daYunOf?: 'A' | 'B'
      bonds: MergedBondRef[]
    }
  >()

  for (const bond of bonds) {
    const bondPerson: RelationshipPerson = { input: bond.input, gender: bond.gender }
    const { nodes } = getRelationshipTimelineNodes(ego, bondPerson, { fromYear, toYear })

    for (const node of nodes) {
      // 流年: 仅当对「本我或该对方」构成 冲/合 才进合并视图 (per-bond 显著)。
      if (node.type === '流年' && node.significance === 'routine') continue

      let key: string
      if (node.type === '流年') {
        key = `LN:${node.year}`
      } else if (node.daYunOf === 'A') {
        // 本我大运: 跨 bond 完全相同 → 去重成一条 (影响全部关系)。
        key = `DY:A:${node.year}:${node.ganZhi.label}`
      } else {
        // 对方大运: 该 bond 独有。
        key = `DY:B:${bond.bondId}:${node.year}:${node.ganZhi.label}`
      }

      const ref: MergedBondRef = {
        bondId: bond.bondId,
        name: bond.name,
        relationshipLabel: bond.relationshipLabel,
        node,
      }

      const existing = acc.get(key)
      if (existing) {
        // 本我大运在每个 bond 里重复 → 只追加 bond 引用, 节点本体相同。
        if (!existing.bonds.some((b) => b.bondId === bond.bondId)) {
          existing.bonds.push(ref)
        }
      } else {
        acc.set(key, {
          date: node.effectiveDate,
          year: node.year,
          kind: node.type,
          ganZhi: node.ganZhi,
          daYunOf: node.daYunOf,
          bonds: [ref],
        })
      }
    }
  }

  // acc 里只有 大运(major) 与 至少对一个 bond 显著的 流年(notable); routine 流年 已在扇出时滤除。
  const nodes: MergedNode[] = []
  for (const [key, m] of acc) {
    const significance: RelNodeSignificance = m.kind === '大运' ? 'major' : 'notable'
    nodes.push({
      key,
      date: m.date,
      year: m.year,
      kind: m.kind,
      ganZhi: m.ganZhi,
      daYunOf: m.daYunOf,
      significance,
      bonds: m.bonds,
      summary: mergedSummary(m.kind, m.daYunOf, m.year, m.ganZhi, m.bonds),
    })
  }

  // 时间轴: 按日期升序; 同日按 显著度(major 先) → 受影响 bond 数降序 → key 稳定。
  nodes.sort((x, y) => {
    if (x.date !== y.date) return x.date < y.date ? -1 : 1
    const sr = sigRank(x.significance) - sigRank(y.significance)
    if (sr !== 0) return sr
    if (x.bonds.length !== y.bonds.length) return y.bonds.length - x.bonds.length
    return x.key < y.key ? -1 : x.key > y.key ? 1 : 0
  })

  const notifications = buildNotifications(nodes, opts)
  return { nodes, notifications }
}

interface NotifCandidate extends MergedNotification {
  fireMs: number
}

function buildNotifications(
  nodes: MergedNode[],
  opts: ComposeBondsTimelineOptions
): MergedNotification[] {
  const fromMs = (opts.notifyFromDate ?? new Date()).getTime()
  const windowEndMs = fromMs + (opts.notifyWithinDays ?? 400) * DAY_MS
  const minGapMs = (opts.minGapDays ?? 7) * DAY_MS

  const candidates: NotifCandidate[] = []
  for (const node of nodes) {
    if (node.significance === 'routine') continue
    const effectiveMs = isoToUtcMs(node.date)
    // 大运提前 半年+一月; 显著流年只提前 一月。
    const leads = node.kind === '大运' ? LEADS : LEADS.slice(1)
    for (const lead of leads) {
      const fireMs = effectiveMs - lead.days * DAY_MS
      if (fireMs >= fromMs && fireMs <= windowEndMs) {
        candidates.push({
          node,
          fireDate: new Date(fireMs).toISOString().slice(0, 10),
          leadDays: lead.days,
          leadLabel: lead.label,
          fireMs,
        })
      }
    }
  }

  // 限额: 优先级 = 显著度 → 受影响 bond 数 → 越早越先 → 越近越先; 贪心取, 满足最小间隔。
  candidates.sort((a, b) => {
    const sr = sigRank(a.node.significance) - sigRank(b.node.significance)
    if (sr !== 0) return sr
    if (a.node.bonds.length !== b.node.bonds.length)
      return b.node.bonds.length - a.node.bonds.length
    if (a.fireMs !== b.fireMs) return a.fireMs - b.fireMs
    return a.leadDays - b.leadDays
  })

  const accepted: NotifCandidate[] = []
  for (const c of candidates) {
    if (opts.maxNotifications !== undefined && accepted.length >= opts.maxNotifications) break
    if (accepted.some((a) => Math.abs(a.fireMs - c.fireMs) < minGapMs)) continue
    accepted.push(c)
  }

  accepted.sort((a, b) => a.fireMs - b.fireMs)
  return accepted.map(({ fireMs: _fireMs, ...rest }) => rest)
}

// ─────────────────────────────────────────────────────────────────────────────
// 流月 living layer — 本我 × 全部 bonds 的近期月度明细。
//
// 与上方生命轴正交: 这是滚动窗口的「本月各段关系如何」。同生命轴一样两两扇出 + 共位合并,
// 但按 (年-月) 共位, 只标 notable/routine (无 major), 且**绝不推送** (流月不推, 同
// relationship-timeline.ts 注)。月柱与人无关(仅取决于年/月), 故 ganZhi 跨 bond 相同,
// 差异在每个 bond 的 冲/合/十神。视图全展示 12 个月, notable 月高亮受影响的关系。
// ─────────────────────────────────────────────────────────────────────────────

export interface ComposeBondsLiuYueOptions {
  /** 滚动窗口起点 (默认现在)。 */
  fromDate?: Date
  /** 窗口月数 (默认 12)。 */
  months?: number
}

function mergedLiuYueSummary(
  year: number,
  month: number,
  ganZhi: GanZhi,
  notableBonds: MergedBondRef[]
): string {
  if (notableBonds.length === 0) {
    return `${year}年${month}月 ${ganZhi.label}，各段关系大致平稳。`
  }
  return `${year}年${month}月 ${ganZhi.label}，与 ${joinNames(notableBonds)} 的关系本月流月互动显著。`
}

/**
 * 合并本我 × 全部 bonds 的流月窗口。纯函数, 确定性。
 *
 * 全部月份都出现(默认 12 条), 每月 `bonds` = 该月对其构成 冲/合 的关系(可空);
 * `significance` = 有受影响关系→notable, 否则 routine。不产生推送。
 */
export function composeBondsLiuYue(
  ego: RelationshipPerson,
  bonds: BondInput[],
  opts: ComposeBondsLiuYueOptions = {}
): { nodes: MergedNode[] } {
  const order: string[] = []
  const acc = new Map<
    string,
    { date: string; year: number; month: number; ganZhi: GanZhi; bonds: MergedBondRef[] }
  >()

  for (const bond of bonds) {
    const bondPerson: RelationshipPerson = { input: bond.input, gender: bond.gender }
    const { nodes } = getRelationshipLiuYueNodes(ego, bondPerson, {
      fromDate: opts.fromDate,
      months: opts.months,
    })
    for (const node of nodes) {
      const key = `LY:${node.year}:${node.month}`
      let bucket = acc.get(key)
      if (!bucket) {
        // 月柱与人无关 → 任一 bond 的 ganZhi 即该月月柱。
        bucket = {
          date: node.effectiveDate,
          year: node.year,
          month: node.month ?? 0,
          ganZhi: node.ganZhi,
          bonds: [],
        }
        acc.set(key, bucket)
        order.push(key)
      }
      if (node.significance === 'notable') {
        bucket.bonds.push({
          bondId: bond.bondId,
          name: bond.name,
          relationshipLabel: bond.relationshipLabel,
          node,
        })
      }
    }
  }

  const nodes: MergedNode[] = order.map((key) => {
    const m = acc.get(key)!
    return {
      key,
      date: m.date,
      year: m.year,
      month: m.month,
      kind: '流月',
      ganZhi: m.ganZhi,
      significance: m.bonds.length > 0 ? 'notable' : 'routine',
      bonds: m.bonds,
      summary: mergedLiuYueSummary(m.year, m.month, m.ganZhi, m.bonds),
    }
  })
  return { nodes }
}
