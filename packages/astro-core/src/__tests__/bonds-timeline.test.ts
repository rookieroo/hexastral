/**
 * 本我中心多关系时间轴引擎测试 (bonds-timeline.ts, BT.1)
 *
 * 以**交叉验证 / 不变量**为主 (不硬编码干支/十神, UTC 时区无关):
 * 1. 本我大运: 跨 bond 共位去重成一条, 列出全部关系, daYunOf=A, 恒 major
 * 2. 对方大运: 各 bond 独立成条 (bonds.length=1), 年份 ↔ 该 bond calculateDaYun
 * 3. 流年合并: 每显著年唯一; 年份集 + 每条受影响 bond ↔ 双人引擎
 * 4. 排序: 日期升序; 同日 major 在 notable 前
 * 5. 推送限额: 非 routine / 升序 / 不晚于生效 / 窗口内 / 最小间隔 / 共位合一 / maxN
 * 6. N=1 退化 + N=0 空轴
 * 7. 确定性
 */

import { describe, expect, test } from 'bun:test'
import { type BondInput, composeBondsTimeline } from '../bonds-timeline'
import { calculateDaYun } from '../dayun'
import type { RelNodeSignificance } from '../relationship-timeline'
import { getRelationshipTimelineNodes, type RelationshipPerson } from '../relationship-timeline'

const DAY = 86_400_000
const ego: RelationshipPerson = { input: { year: 1990, month: 3, day: 15, hour: 14 }, gender: '男' }
const bonds: BondInput[] = [
  {
    bondId: 'b1',
    name: '小美',
    relationshipLabel: 'partner',
    input: { year: 1992, month: 7, day: 20, hour: 10 },
    gender: '女',
  },
  {
    bondId: 'b2',
    name: '阿强',
    relationshipLabel: 'friend',
    input: { year: 1988, month: 11, day: 3, hour: 8 },
    gender: '男',
  },
  {
    bondId: 'b3',
    name: '妈妈',
    relationshipLabel: 'parent',
    input: { year: 1965, month: 5, day: 1, hour: 6 },
    gender: '女',
  },
]
const RANGE = { fromYear: 2000, toYear: 2060 }
const ALL_IDS = ['b1', 'b2', 'b3']

function rank(s: RelNodeSignificance): number {
  return s === 'major' ? 0 : s === 'notable' ? 1 : 2
}

/** 每个 bond 的 pairwise 流年 significance 缓存 (year → significance)。 */
function perBondLiuNianSig() {
  return bonds.map((b) => ({
    bondId: b.bondId,
    sig: new Map(
      getRelationshipTimelineNodes(ego, { input: b.input, gender: b.gender }, RANGE)
        .nodes.filter((p) => p.type === '流年')
        .map((p) => [p.year, p.significance] as const)
    ),
  }))
}

describe('本我大运 — 共位去重', () => {
  test('跨 bond 去重成一条, 影响全部关系, daYunOf=A, 恒 major', () => {
    const { nodes } = composeBondsTimeline(ego, bonds, RANGE)
    const egoDaYun = nodes.filter((n) => n.kind === '大运' && n.daYunOf === 'A')

    const expectedYears = calculateDaYun(ego.input, ego.gender)
      .steps.map((s) => s.startYear)
      .filter((y) => y >= RANGE.fromYear && y <= RANGE.toYear)
    expect(egoDaYun.map((n) => n.year)).toEqual(expectedYears)

    // 去重: 每年仅一条
    expect(new Set(egoDaYun.map((n) => n.year)).size).toBe(egoDaYun.length)
    for (const n of egoDaYun) {
      expect(n.significance).toBe('major')
      expect(n.bonds.map((b) => b.bondId).sort()).toEqual(ALL_IDS)
    }
  })
})

describe('对方大运 — 各自成条', () => {
  test('bonds.length=1, 年份 ↔ 该 bond calculateDaYun, 恒 major', () => {
    const { nodes } = composeBondsTimeline(ego, bonds, RANGE)
    const counterpart = nodes.filter((n) => n.kind === '大运' && n.daYunOf === 'B')
    expect(counterpart.length).toBeGreaterThan(0)
    for (const n of counterpart) {
      expect(n.bonds.length).toBe(1)
      expect(n.significance).toBe('major')
    }
    for (const bond of bonds) {
      const expected = calculateDaYun(bond.input, bond.gender)
        .steps.map((s) => s.startYear)
        .filter((y) => y >= RANGE.fromYear && y <= RANGE.toYear)
      const got = counterpart
        .filter((n) => n.bonds[0]!.bondId === bond.bondId)
        .map((n) => n.year)
        .sort((a, b) => a - b)
      expect(got).toEqual(expected)
    }
  })
})

describe('流年合并 — 与双人引擎交叉验证', () => {
  test('每显著年唯一; 年份集 = 至少一 bond notable 的年; 每条受影响 bond 精确', () => {
    const { nodes } = composeBondsTimeline(ego, bonds, RANGE)
    const mergedLN = nodes.filter((n) => n.kind === '流年')
    const perBond = perBondLiuNianSig()

    // 年份唯一
    const years = mergedLN.map((n) => n.year)
    expect(new Set(years).size).toBe(years.length)

    // 年份集交叉验证
    const expectedYears: number[] = []
    for (let y = RANGE.fromYear; y <= RANGE.toYear; y++) {
      if (perBond.some((pb) => pb.sig.get(y) === 'notable')) expectedYears.push(y)
    }
    expect([...years].sort((a, b) => a - b)).toEqual(expectedYears)

    // 每条受影响 bond 精确
    for (const mn of mergedLN) {
      expect(mn.significance).toBe('notable')
      const expectedAffected = perBond
        .filter((pb) => pb.sig.get(mn.year) === 'notable')
        .map((pb) => pb.bondId)
        .sort()
      expect(mn.bonds.map((b) => b.bondId).sort()).toEqual(expectedAffected)
      expect(expectedAffected.length).toBeGreaterThan(0)
    }
  })
})

describe('排序', () => {
  test('日期升序; 同日 major 在 notable 前', () => {
    const { nodes } = composeBondsTimeline(ego, bonds, RANGE)
    for (let i = 1; i < nodes.length; i++) {
      const prev = nodes[i - 1]!
      const cur = nodes[i]!
      expect(prev.date <= cur.date).toBe(true)
      if (prev.date === cur.date && prev.significance !== cur.significance) {
        expect(rank(prev.significance)).toBeLessThanOrEqual(rank(cur.significance))
      }
    }
  })
})

describe('notifications — 推送限额', () => {
  test('非 routine / 升序 / 不晚于生效 / 窗口内 / 满足最小间隔', () => {
    const fromMs = Date.UTC(2026, 0, 1)
    const within = 800
    const minGapDays = 7
    const { notifications } = composeBondsTimeline(ego, bonds, {
      ...RANGE,
      notifyFromDate: new Date(fromMs),
      notifyWithinDays: within,
      minGapDays,
    })
    const endMs = fromMs + within * DAY
    for (const nf of notifications) {
      expect(nf.node.significance).not.toBe('routine')
      const fireMs = Date.parse(`${nf.fireDate}T00:00:00Z`)
      const effMs = Date.parse(`${nf.node.date}T00:00:00Z`)
      expect(fireMs).toBeGreaterThanOrEqual(fromMs)
      expect(fireMs).toBeLessThanOrEqual(endMs)
      expect(fireMs).toBeLessThanOrEqual(effMs)
    }
    const dates = notifications.map((n) => n.fireDate)
    expect(dates).toEqual([...dates].sort())
    for (let i = 1; i < notifications.length; i++) {
      const a = Date.parse(`${notifications[i - 1]!.fireDate}T00:00:00Z`)
      const b = Date.parse(`${notifications[i]!.fireDate}T00:00:00Z`)
      expect(b - a).toBeGreaterThanOrEqual(minGapDays * DAY)
    }
  })

  test('共位节点合成一条: 同 key 至多 大运2 / 流年1 条', () => {
    const fromMs = Date.UTC(2026, 0, 1)
    const { notifications } = composeBondsTimeline(ego, bonds, {
      ...RANGE,
      notifyFromDate: new Date(fromMs),
      notifyWithinDays: 800,
      minGapDays: 1,
    })
    const byKey = new Map<string, number>()
    for (const nf of notifications) byKey.set(nf.node.key, (byKey.get(nf.node.key) ?? 0) + 1)
    for (const [key, count] of byKey) {
      expect(count).toBeLessThanOrEqual(key.startsWith('DY:') ? 2 : 1)
    }
  })

  test('maxNotifications 硬上限', () => {
    const { notifications } = composeBondsTimeline(ego, bonds, {
      ...RANGE,
      notifyFromDate: new Date(Date.UTC(2026, 0, 1)),
      notifyWithinDays: 1500,
      minGapDays: 1,
      maxNotifications: 2,
    })
    expect(notifications.length).toBeLessThanOrEqual(2)
  })

  test('大运换运在窗口内 → 半年 + 一个月 两次推送 (引擎派生窗口)', () => {
    const futureStep = calculateDaYun(ego.input, ego.gender).steps.find((s) => s.startYear >= 2026)!
    const effMs = Date.UTC(futureStep.startYear, ego.input.month - 1, ego.input.day)
    const fromMs = effMs - 300 * DAY
    const { notifications } = composeBondsTimeline(ego, bonds, {
      ...RANGE,
      notifyFromDate: new Date(fromMs),
      notifyWithinDays: 400,
      minGapDays: 1,
    })
    const egoNotifs = notifications.filter(
      (n) =>
        n.node.kind === '大运' && n.node.daYunOf === 'A' && n.node.year === futureStep.startYear
    )
    expect(egoNotifs.map((n) => n.leadLabel).sort()).toEqual(['一个月', '半年'])
  })

  test('最小间隔放大 → 至多一条', () => {
    const { notifications } = composeBondsTimeline(ego, bonds, {
      ...RANGE,
      notifyFromDate: new Date(Date.UTC(2026, 0, 1)),
      notifyWithinDays: 1500,
      minGapDays: 100000,
    })
    expect(notifications.length).toBeLessThanOrEqual(1)
  })
})

describe('退化情形', () => {
  test('N=1: 单 bond → 所有节点仅含该 bond', () => {
    const { nodes } = composeBondsTimeline(ego, [bonds[0]!], RANGE)
    expect(nodes.length).toBeGreaterThan(0)
    for (const n of nodes) {
      expect(n.bonds.every((b) => b.bondId === 'b1')).toBe(true)
    }
  })

  test('N=0: 无 bond → 空轴', () => {
    const { nodes, notifications } = composeBondsTimeline(ego, [], RANGE)
    expect(nodes).toEqual([])
    expect(notifications).toEqual([])
  })
})

describe('确定性', () => {
  test('同输入同输出', () => {
    const opts = {
      ...RANGE,
      notifyFromDate: new Date(Date.UTC(2026, 0, 1)),
      notifyWithinDays: 800,
    }
    const a = composeBondsTimeline(ego, bonds, opts)
    const b = composeBondsTimeline(ego, bonds, opts)
    expect(a.nodes).toEqual(b.nodes)
    expect(a.notifications).toEqual(b.notifications)
  })
})
