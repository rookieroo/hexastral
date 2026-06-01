/**
 * 本我中心多关系时间轴 — 服务端合并/隐私投影测试 (BT.3 + BT.6)
 *
 * 1. 隐私 (D2 承重): DTO 绝不含对方原始 solarDate/timeIndex
 * 2. resolveResonanceCounterpart: 原始 bond(ego=personA)→personB; 镜像 bond(ego=personB)→personA
 * 3. buildEgoTimeline: 非法生辰跳过; 节点引用正确 bondId
 * 4. 免费层钩子 (BT.6): 当前年窗口 collapse; 仅第 1 个 bond
 */

import { describe, expect, test } from 'bun:test'
import {
  type BirthTriple,
  buildEgoTimeline,
  type PairReadingBirth,
  type ResolvedBond,
  resolveResonanceCounterpart,
} from './bonds-timeline'

const egoBirth: BirthTriple = { solarDate: '1990-3-15', timeIndex: 7, gender: '男' }
const bonds: ResolvedBond[] = [
  {
    bondId: 'b1',
    name: '小美',
    relationshipLabel: 'partner',
    counterpart: { solarDate: '1992-7-20', timeIndex: 5, gender: '女' },
  },
  {
    bondId: 'b2',
    name: '阿强',
    relationshipLabel: 'friend',
    counterpart: { solarDate: '1988-11-3', timeIndex: 4, gender: '男' },
  },
]
const WIDE = { fromYear: 2026, toYear: 2060 }

describe('隐私投影 (D2 承重)', () => {
  test('DTO 绝不含对方原始 solarDate / timeIndex', () => {
    const dto = buildEgoTimeline(egoBirth, bonds, WIDE)
    const json = JSON.stringify(dto)
    // 无原始字段名
    expect(json).not.toContain('solarDate')
    expect(json).not.toContain('timeIndex')
    // 无任一对方的原始日期值
    for (const b of bonds) {
      expect(json).not.toContain(b.counterpart.solarDate)
    }
    expect(dto.nodes.length).toBeGreaterThan(0)
  })

  test('node.bonds 仅含白名单键 (bondId/name/relationshipLabel)', () => {
    const dto = buildEgoTimeline(egoBirth, bonds, WIDE)
    const allowed = new Set(['bondId', 'name', 'relationshipLabel'])
    for (const n of dto.nodes) {
      for (const rb of n.bonds) {
        for (const k of Object.keys(rb)) expect(allowed.has(k)).toBe(true)
      }
    }
  })
})

describe('resolveResonanceCounterpart — 镜像 bond 非对称', () => {
  test('原始 bond (ego=personA) → 对方取 personB', () => {
    const reading: PairReadingBirth = {
      personASolarDate: '1990-3-15',
      personATimeIndex: 7,
      personAGender: '男',
      personBSolarDate: '1992-7-20',
      personBTimeIndex: 5,
      personBGender: '女',
    }
    expect(resolveResonanceCounterpart(egoBirth, reading)).toEqual({
      solarDate: '1992-7-20',
      timeIndex: 5,
      gender: '女',
    })
  })

  test('镜像 bond (ego=personB) → 对方取 personA', () => {
    const reading: PairReadingBirth = {
      personASolarDate: '1985-1-1',
      personATimeIndex: 3,
      personAGender: '女',
      personBSolarDate: '1990-3-15',
      personBTimeIndex: 7,
      personBGender: '男',
    }
    expect(resolveResonanceCounterpart(egoBirth, reading)).toEqual({
      solarDate: '1985-1-1',
      timeIndex: 3,
      gender: '女',
    })
  })
})

describe('buildEgoTimeline — 健壮性', () => {
  test('本我生辰非法 → 空轴', () => {
    expect(buildEgoTimeline({ solarDate: 'bad', timeIndex: 0, gender: '男' }, bonds)).toEqual({
      nodes: [],
      notifications: [],
    })
  })

  test('对方生辰非法的 bond 被跳过', () => {
    const withBad: ResolvedBond[] = [
      ...bonds,
      { bondId: 'bx', name: 'X', counterpart: { solarDate: 'nope', timeIndex: 0, gender: '男' } },
    ]
    const dto = buildEgoTimeline(egoBirth, withBad, WIDE)
    expect(JSON.stringify(dto)).not.toContain('bx')
    expect(dto.nodes.length).toBeGreaterThan(0)
  })
})

describe('免费层钩子 (BT.6) — 当前年 + 全部 bond, 无推送', () => {
  test('Pro 窗口跨多年; 免费窗口 collapse 到当前年', () => {
    const proDto = buildEgoTimeline(egoBirth, bonds, WIDE)
    expect(new Set(proDto.nodes.map((n) => n.year)).size).toBeGreaterThan(1)
  })

  test('免费窗口 (fromYear=toYear) → 所有节点都在当前年', () => {
    // 从引擎派生一个有流年节点的年份, 保证非空
    const proDto = buildEgoTimeline(egoBirth, bonds, WIDE)
    const year = proDto.nodes.find((n) => n.kind === '流年')?.year
    expect(year).toBeDefined()

    const freeDto = buildEgoTimeline(egoBirth, bonds, { fromYear: year!, toYear: year! })
    expect(freeDto.nodes.length).toBeGreaterThan(0)
    for (const n of freeDto.nodes) expect(n.year).toBe(year)
  })

  test('免费层展示全部 (≤3) bond, 不限第一个', () => {
    // 跨足够宽窗口, 断言不止 b1 出现 (奖励裂变: 多 bond 都进合并视图)
    const dto = buildEgoTimeline(egoBirth, bonds, WIDE)
    const seen = new Set<string>()
    for (const n of dto.nodes) for (const rb of n.bonds) seen.add(rb.bondId)
    expect(seen.size).toBeGreaterThan(1)
    expect(seen.has('b1')).toBe(true)
  })
})
