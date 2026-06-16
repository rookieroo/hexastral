/**
 * Golden tests for the 紫微 synastry core. iztro owns placement correctness;
 * these pin the SUMMARY shape (生年四化 extraction, palace map) and the PAIR
 * logic (飞星 landing + tone) against two fixed births, so a refactor or an
 * iztro bump that shifts behavior is caught.
 *
 * Fixtures:
 *   A = 1990-08-15, 时辰 index 5 (辰时), 男
 *   B = 1992-03-20, 时辰 index 8 (未时), 女
 * (no longitude/city → no true-solar-time adjustment → fully deterministic)
 */

import { describe, expect, it } from 'bun:test'
import { analyzeZiweiSynastry, summarizeZiwei } from './ziwei-synastry'

const A = { solarDate: '1990-08-15', timeIndex: 5, gender: '男' as const }
const B = { solarDate: '1992-03-20', timeIndex: 8, gender: '女' as const }

describe('summarizeZiwei', () => {
  it('extracts 五行局, 命宫 主星 and brightness', () => {
    const a = summarizeZiwei(A)
    expect(a.fiveElementsClass).toBe('土五局')
    expect(a.palaces.命宫.majorStars.map((s) => s.name)).toEqual(['武曲', '天相'])
    const wuqu = a.palaces.命宫.majorStars.find((s) => s.name === '武曲')
    expect(wuqu?.brightness).toBe('得')
  })

  it('reads 生年四化 off the stars (single-char mutagen → full token)', () => {
    const a = summarizeZiwei(A)
    expect(a.birthSiHua).toEqual({ 化权: '武曲', 化禄: '太阳', 化科: '太阴', 化忌: '天同' })
    // the 化权 marker is attached to the star, not lost
    expect(a.palaces.命宫.majorStars.find((s) => s.name === '武曲')?.siHua).toBe('化权')
  })

  it('builds a complete star → palace map (12 palaces present)', () => {
    const a = summarizeZiwei(A)
    expect(Object.keys(a.palaces)).toHaveLength(12)
    expect(a.starToPalace.武曲).toBe('命宫')
    expect(a.starToPalace.贪狼).toBe('夫妻')
  })

  it('is deterministic', () => {
    expect(summarizeZiwei(A)).toEqual(summarizeZiwei(A))
  })
})

describe('analyzeZiweiSynastry', () => {
  const syn = analyzeZiweiSynastry(summarizeZiwei(A), summarizeZiwei(B))

  it('flies every 生年四化 star into the other chart (both directions)', () => {
    // A has 4 birth-四化, B has 3 — all major stars, so all land.
    expect(syn.flyingStars).toHaveLength(7)
    expect(syn.flyingStars.every((f) => f.landsIn !== null)).toBe(true)
  })

  it('lands B 化忌 (武曲) in A 命宫 — pressure on the core self', () => {
    const f = syn.flyingStars.find((x) => x.from === 'B' && x.siHua === '化忌')
    expect(f?.star).toBe('武曲')
    expect(f?.landsIn).toBe('命宫')
    expect(f?.tone).toBe('tension')
    expect(f?.note).toContain('乙方的化忌（武曲）落入甲方的命宫')
  })

  it('lands A 化权 (武曲) in B 夫妻 — drive in the relationship realm', () => {
    const f = syn.flyingStars.find((x) => x.from === 'A' && x.siHua === '化权')
    expect(f?.landsIn).toBe('夫妻')
    expect(f?.tone).toBe('growth')
  })

  it('captures 命宫 resonance + 夫妻宫 cross-read', () => {
    expect(syn.mingResonance.aStars).toEqual(['武曲', '天相'])
    expect(syn.mingResonance.bStars).toEqual(['天府'])
    expect(syn.spouseCross.aWants).toEqual(['贪狼'])
    expect(syn.spouseCross.bWants).toEqual(['武曲', '破军'])
  })

  it('emits a flat facts list (命宫 + 夫妻 + every flying star)', () => {
    expect(syn.facts).toHaveLength(2 + syn.flyingStars.length)
    expect(syn.facts[0]).toContain('命宫')
  })

  it('leans growth for this mixed pairing', () => {
    expect(syn.overall).toBe('growth')
  })

  it('mirrors A↔B (swapping inputs swaps every flying star direction)', () => {
    const swapped = analyzeZiweiSynastry(summarizeZiwei(B), summarizeZiwei(A))
    expect(swapped.flyingStars).toHaveLength(syn.flyingStars.length)
    const back = swapped.flyingStars.find((x) => x.from === 'A' && x.siHua === '化忌')
    // B's 化忌 武曲 → A 命宫 becomes, after swap, A's 化忌 武曲 → B 命宫
    expect(back?.star).toBe('武曲')
    expect(back?.landsIn).toBe('命宫')
  })
})
