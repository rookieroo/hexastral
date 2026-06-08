/**
 * 关系决策推演 — 服务端投影测试
 * 1. 隐私 (D2): DTO 绝不含任一方原始 solarDate / timeIndex
 * 2. 形状: windows 有稳定 key, bestKey 指向最高分窗口, verdict 非空
 * 3. 健壮性: 生辰非法 → 空推演
 */

import { describe, expect, test } from 'bun:test'
import type { BirthTriple } from './bonds-timeline'
import { buildBondMakeIf } from './relationship-makeif'

const egoBirth: BirthTriple = { solarDate: '1990-3-15', timeIndex: 7, gender: '男' }
const counterpart: BirthTriple = { solarDate: '1992-7-20', timeIndex: 5, gender: '女' }
const OPTS = { fromDate: new Date(Date.UTC(2026, 0, 1)), months: 12 }

describe('buildBondMakeIf', () => {
  test('隐私 (D2): 绝不含原始 solarDate / timeIndex', () => {
    const json = JSON.stringify(buildBondMakeIf(egoBirth, counterpart, OPTS))
    expect(json).not.toContain('solarDate')
    expect(json).not.toContain('timeIndex')
    expect(json).not.toContain(counterpart.solarDate)
    expect(json).not.toContain(egoBirth.solarDate)
  })

  test('形状: 12 窗口, 每个有 key/lean, bestKey 指向最高分, verdict 非空', () => {
    const dto = buildBondMakeIf(egoBirth, counterpart, OPTS)
    expect(dto.windows).toHaveLength(12)
    expect(dto.yongshen.length).toBeGreaterThan(0)
    expect(dto.verdict.length).toBeGreaterThan(0)
    for (const w of dto.windows) {
      expect(w.key).toBe(`${w.year}-${w.month}`)
      expect(['favorable', 'mixed', 'caution']).toContain(w.lean)
    }
    const max = Math.max(...dto.windows.map((w) => w.score))
    const bestWin = dto.windows.find((w) => w.key === dto.bestKey)
    expect(bestWin?.score).toBe(max)
  })

  test('生辰非法 → 空推演', () => {
    const dto = buildBondMakeIf({ solarDate: 'bad', timeIndex: 0, gender: '男' }, counterpart)
    expect(dto.windows).toEqual([])
    expect(dto.verdict).toBe('')
  })
})
