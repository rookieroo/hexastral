/**
 * D2 八宅升级 tests — 宅卦游年 / 宅命合参 / 床灶门书桌吉位.
 */

import { describe, expect, test } from 'bun:test'
import {
  computeBaZhai,
  furniturePlacement,
  houseDirections,
  houseGuaFromSit,
  luckyDirections,
  zhaiMingConcord,
} from '../../feng/ba-zhai'

describe('宅卦游年 (houseDirections)', () => {
  test('坐北 = 坎宅, 东四宅, 游年 == 坎卦大游年', () => {
    expect(houseGuaFromSit('坎')).toBe('坎')
    const h = houseDirections('坎')
    expect(h.zhaiGua).toBe('坎')
    expect(h.group).toBe('东四命')
    // 坎宅: 生气巽 / 天医震 / 延年离 / 伏位坎
    expect(h.lucky.map((d) => d.palace)).toEqual(['巽', '震', '离', '坎'])
    expect(h.lucky).toEqual(luckyDirections('坎'))
  })

  test('坐西北 = 乾宅, 西四宅', () => {
    const h = houseDirections('乾')
    expect(h.zhaiGua).toBe('乾')
    expect(h.group).toBe('西四命')
  })
})

describe('宅命合参 (zhaiMingConcord)', () => {
  test('坎命 + 坎宅 → 宅命相配 (同东四)', () => {
    const c = zhaiMingConcord('坎', '坎')
    expect(c.concordant).toBe(true)
    expect(c.verdict).toBe('宅命相配')
  })

  test('坎命(东四) + 乾宅(西四) → 宅命不配', () => {
    const c = zhaiMingConcord('坎', '乾')
    expect(c.concordant).toBe(false)
    expect(c.verdict).toBe('宅命不配')
    expect(c.advice).toContain('以人为本')
  })
})

describe('床灶门书桌吉位 (furniturePlacement)', () => {
  test('坎命: 门生气巽 / 床头天医震 / 灶坐绝命坤向天医震', () => {
    const p = furniturePlacement('坎')
    expect(p.door.kind).toBe('生气')
    expect(p.door.palace).toBe('巽')
    expect(p.bedHead.kind).toBe('天医')
    expect(p.bedHead.palace).toBe('震')
    expect(p.desk.kind).toBe('生气')
    expect(p.stove.sitAt.kind).toBe('绝命') // 坐凶
    expect(p.stove.sitAt.palace).toBe('坤')
    expect(p.stove.mouthToward.kind).toBe('天医') // 向吉
  })
})

describe('computeBaZhai 集成 (1990 男 = 坎命)', () => {
  const r = computeBaZhai({
    birthDate: new Date('1990-06-01T00:00:00Z'),
    gender: '男',
    sitPalace: '坎',
    doorPalace: '巽',
  })

  test('命卦 坎, placement 始终在', () => {
    expect(r.mingGua).toBe('坎')
    expect(r.placement.door.palace).toBe('巽')
  })

  test('提供 sitPalace → house + concord 填充', () => {
    expect(r.house?.zhaiGua).toBe('坎')
    expect(r.concord?.verdict).toBe('宅命相配')
    expect(r.fit).toBeDefined() // sit + door given
  })
})
