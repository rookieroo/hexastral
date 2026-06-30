/**
 * D4 形理整合 tests — 山管人丁水管财、零正、格局救应.
 */

import { describe, expect, test } from 'bun:test'
import { computeFlyingStars } from '../../feng/flying-stars'
import { detectPatterns } from '../../feng/flying-stars-patterns'
import { correlateFormAndStars, emptyFormByPalace, type FormByPalace } from '../../feng/form-li'

// 子山午向 (180°) built in 8运 (2010), read in 9运 (2026): 离=向首, 坎=坐山.
// patterns use the build 运 (8运 → 双星会向); form-li 旺衰 uses the current 运 (9).
const fs = computeFlyingStars({ facingDegTrue: 180, buildYear: 2010, asOf: new Date(2026, 5, 1) })
const yun = fs.currentYuanYun.yuanYun // 9
const patterns = detectPatterns({
  yuanYun: fs.buildYuanYun.yuanYun,
  sitPalace: fs.sitMountain.palace,
  facePalace: fs.faceMountain.palace,
  periodChart: fs.periodChart,
  mountainChart: fs.mountainChart,
  facingChart: fs.facingChart,
})

function findPalace(form: FormByPalace) {
  return correlateFormAndStars({
    yuanYun: yun,
    mountainChart: fs.mountainChart,
    facingChart: fs.facingChart,
    formByPalace: form,
    sitPalace: fs.sitMountain.palace,
    facePalace: fs.faceMountain.palace,
    patterns,
  })
}

describe('山管人丁水管财', () => {
  test('当旺向星方见水 → 旺财', () => {
    // find a palace whose facing star is 当令 (==9) and give it water.
    const facePalace = (Object.keys(fs.facingChart) as (keyof typeof fs.facingChart)[]).find(
      (k) => k !== '中' && fs.facingChart[k] === 9
    ) as Exclude<keyof typeof fs.facingChart, '中'>
    const form = emptyFormByPalace()
    form[facePalace] = { hasMountain: false, hasWater: true, hasSha: false }
    const res = findPalace(form)
    const pl = res.palaces.find((p) => p.palace === facePalace)
    expect(pl?.findings.some((f) => f.verdict === '旺财')).toBe(true)
  })

  test('当旺向星方见山 → 破财', () => {
    const facePalace = (Object.keys(fs.facingChart) as (keyof typeof fs.facingChart)[]).find(
      (k) => k !== '中' && fs.facingChart[k] === 9
    ) as Exclude<keyof typeof fs.facingChart, '中'>
    const form = emptyFormByPalace()
    form[facePalace] = { hasMountain: true, hasWater: false, hasSha: false }
    const res = findPalace(form)
    const pl = res.palaces.find((p) => p.palace === facePalace)
    expect(pl?.findings.some((f) => f.verdict === '破财')).toBe(true)
  })

  test('五黄方见水 → 动凶', () => {
    const wuPalace = (Object.keys(fs.facingChart) as (keyof typeof fs.facingChart)[]).find(
      (k) => k !== '中' && fs.facingChart[k] === 5
    ) as Exclude<keyof typeof fs.facingChart, '中'> | undefined
    if (!wuPalace) return // 5 may sit at 中; skip if so
    const form = emptyFormByPalace()
    form[wuPalace] = { hasMountain: false, hasWater: true, hasSha: false }
    const res = findPalace(form)
    const pl = res.palaces.find((p) => p.palace === wuPalace)
    expect(pl?.findings.some((f) => f.verdict === '动凶')).toBe(true)
  })

  test('形煞 → 化煞 overlay', () => {
    const form = emptyFormByPalace()
    form.震 = { hasMountain: false, hasWater: false, hasSha: true }
    const res = findPalace(form)
    expect(
      res.palaces.find((p) => p.palace === '震')?.findings.some((f) => f.verdict === '化煞')
    ).toBe(true)
  })

  test('neutral palaces are omitted', () => {
    const res = findPalace(emptyFormByPalace())
    expect(res.palaces.length).toBe(0)
  })
})

describe('零正神 (9运: 正神离 / 零神坎)', () => {
  test('正神离见水 → 不利; 零神坎见水 → 得位', () => {
    const form = emptyFormByPalace()
    form.离 = { hasMountain: false, hasWater: true, hasSha: false } // 正神下水
    form.坎 = { hasMountain: false, hasWater: true, hasSha: false } // 零神得水
    const res = findPalace(form)
    expect(res.zhengLing.zhengShen).toBe('离')
    expect(res.zhengLing.lingShen).toBe('坎')
    expect(res.zhengLing.findings.some((f) => f.palace === '离' && !f.auspicious)).toBe(true)
    expect(res.zhengLing.findings.some((f) => f.palace === '坎' && f.auspicious)).toBe(true)
  })
})

describe('格局救应 (双星会向 → 向首宜水)', () => {
  test('子山午向9运为双星会向; 向首(离)见水 → favourable', () => {
    expect(patterns.map((p) => p.kind)).toContain('双星会向')
    const form = emptyFormByPalace()
    form.离 = { hasMountain: false, hasWater: true, hasSha: false }
    const res = findPalace(form)
    const r = res.patternRescue.find((x) => x.pattern === '双星会向')
    expect(r?.favourable).toBe(true)
  })

  test('向首(离)无水 → 待引', () => {
    const res = findPalace(emptyFormByPalace())
    expect(res.patternRescue.find((x) => x.pattern === '双星会向')?.favourable).toBe(false)
  })
})
