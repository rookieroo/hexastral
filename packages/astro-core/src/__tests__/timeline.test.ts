/**
 * 命运时间轴节点引擎测试 (timeline.ts)
 *
 * 以**不变量 / 交叉验证**为主 (不硬编码十神值),保证与机器时区无关:
 * 1. 大运换运节点 ↔ calculateDaYun 的 startYear 一致,且恒为 major
 * 2. 流年节点的 ganZhi / shiShen ↔ getLiuNian + getShiShen 交叉一致
 * 3. 冲日支检测正确 (六冲),且评级 notable
 * 4. 提前推送: fireDate 在窗口内、不晚于 effectiveDate、排除 routine、升序
 * 5. 大运换运在窗口内产出"半年 + 一个月"两次推送
 * 6. 确定性: 同输入同输出
 */

import { describe, expect, test } from 'bun:test'
import { calculateDaYun, getLiuNian } from '../dayun'
import { getShiShen } from '../shishen'
import { getTimelineNodes, getTimelineNotifications } from '../timeline'
import type { DateTimeInput, EarthlyBranch } from '../types'

const INPUT: DateTimeInput = { year: 1990, month: 3, day: 15, hour: 14 }

/** 地支六冲 (测试内自备,用于交叉验证 timeline 内部逻辑) */
const CLASH: Record<EarthlyBranch, EarthlyBranch> = {
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

const DAY = 86_400_000

describe('getTimelineNodes — 大运换运节点', () => {
  test('节点年份与 calculateDaYun 的 startYear 一致,且恒为 major', () => {
    const { daYun, nodes } = getTimelineNodes(INPUT, '男')
    const dayunNodes = nodes.filter((n) => n.type === '大运')
    const expectedYears = daYun.steps
      .map((s) => s.startYear)
      .filter((y) => y >= INPUT.year && y <= INPUT.year + 90)

    expect(dayunNodes.map((n) => n.year)).toEqual(expectedYears)
    for (const n of dayunNodes) expect(n.significance).toBe('major')
    // 干支与对应大运步一致
    for (const n of dayunNodes) {
      const step = daYun.steps.find((s) => s.startYear === n.year)!
      expect(n.ganZhi.label).toBe(step.ganZhi.label)
    }
  })
})

describe('getTimelineNodes — 流年节点交叉验证', () => {
  test('ganZhi / shiShen 与 getLiuNian + getShiShen 一致', () => {
    const { daYun, nodes } = getTimelineNodes(INPUT, '男', { fromYear: 2020, toYear: 2030 })
    const dayMaster = daYun.pillars.day.stem

    for (const year of [2020, 2024, 2027, 2030]) {
      const node = nodes.find((n) => n.type === '流年' && n.year === year)
      expect(node).toBeDefined()
      const ln = getLiuNian(year)
      expect(node!.ganZhi.label).toBe(ln.label)
      expect(node!.shiShen).toEqual(getShiShen(dayMaster, ln.stem))
    }
  })

  test('节点按年份升序,同年大运排在流年前', () => {
    const { nodes } = getTimelineNodes(INPUT, '男', { fromYear: 1997, toYear: 2000 })
    for (let i = 1; i < nodes.length; i++) {
      const prev = nodes[i - 1]!
      const cur = nodes[i]!
      expect(prev.year).toBeLessThanOrEqual(cur.year)
      if (prev.year === cur.year && prev.type !== cur.type) {
        expect(prev.type).toBe('大运')
      }
    }
  })
})

describe('getTimelineNodes — 冲日支检测', () => {
  test('流年支冲日支 → clashesDayBranch=true 且 notable', () => {
    const { daYun, nodes } = getTimelineNodes(INPUT, '男', { fromYear: 1990, toYear: 2002 })
    const dayBranch = daYun.pillars.day.branch
    const clashBranch = CLASH[dayBranch]

    // 12 年内必有一个流年支 == 日支之冲
    const clashNodes = nodes.filter((n) => n.type === '流年' && n.ganZhi.branch === clashBranch)
    expect(clashNodes.length).toBeGreaterThanOrEqual(1)
    for (const n of clashNodes) {
      expect(n.clashesDayBranch).toBe(true)
      expect(n.significance).toBe('notable')
    }

    // 反向: 未冲的流年 clashesDayBranch=false
    const nonClash = nodes.find(
      (n) => n.type === '流年' && n.ganZhi.branch !== clashBranch && n.ganZhi.branch !== dayBranch
    )
    expect(nonClash!.clashesDayBranch).toBe(false)
  })
})

describe('getTimelineNotifications — 提前推送', () => {
  test('窗口内: fireDate 合法、不晚于 effectiveDate、排除 routine、升序', () => {
    const fromMs = Date.UTC(2024, 0, 1)
    const withinDays = 400
    const notifs = getTimelineNotifications(INPUT, '男', {
      fromDate: new Date(fromMs),
      withinDays,
    })
    const endMs = fromMs + withinDays * DAY

    for (const nf of notifs) {
      const fireMs = Date.parse(`${nf.fireDate}T00:00:00Z`)
      const effMs = Date.parse(`${nf.node.effectiveDate}T00:00:00Z`)
      expect(fireMs).toBeGreaterThanOrEqual(fromMs)
      expect(fireMs).toBeLessThanOrEqual(endMs)
      expect(fireMs).toBeLessThanOrEqual(effMs)
      expect(nf.node.significance).not.toBe('routine')
    }
    const dates = notifs.map((n) => n.fireDate)
    expect(dates).toEqual([...dates].sort())
  })

  test('大运换运在窗口内 → 半年 + 一个月 两次推送', () => {
    // 1990-03-15 男 起运 7 岁 → 大运换运年 1997/2007/2017...
    // 取 2007 换运(生效 2007-03-15),窗口跨越其半年与一月提前点
    const notifs = getTimelineNotifications(INPUT, '男', {
      fromDate: new Date(Date.UTC(2006, 7, 1)),
      withinDays: 300,
    })
    const dayunNotifs = notifs.filter((n) => n.node.type === '大运' && n.node.year === 2007)
    expect(dayunNotifs.length).toBe(2)
    expect(dayunNotifs.map((n) => n.leadLabel).sort()).toEqual(['一个月', '半年'])
  })
})

describe('determinism', () => {
  test('同输入同输出', () => {
    const a = getTimelineNodes(INPUT, '男')
    const b = getTimelineNodes(INPUT, '男')
    expect(a.nodes).toEqual(b.nodes)

    const opts = { fromDate: new Date(Date.UTC(2024, 0, 1)), withinDays: 400 }
    expect(getTimelineNotifications(INPUT, '男', opts)).toEqual(
      getTimelineNotifications(INPUT, '男', opts)
    )
  })
})
