import { describe, expect, test } from 'bun:test'

import {
  assessLociCoverage,
  buildSuggestedLoci,
  formatSuggestedLociBlock,
} from './faceoracle-suggested-loci'

describe('buildSuggestedLoci', () => {
  test('excludes unclear and ranks tension mounts', () => {
    const suggested = buildSuggestedLoci({
      face: {
        tianTing: '饱满有神',
        yinTang: 'unclear',
        complexion: '偏燥发暗',
        eyeType: '清秀',
      },
      palmLeft: {
        lifeLine: '深长',
        heartLine: '浅断有岛',
        mountVenus: '塌陷',
        mountJupiter: 'unclear',
      },
      palmRight: {
        fateLine: '清晰',
        mountMoon: '丰满',
        specialMarks: '感情线有十字',
      },
      natalSummary:
        'gender=男; palmInnate=palm_l; palmAcquired=palm_r; currentDaYun=甲子 ages=30-40',
      topN: 20,
    })
    expect(suggested.every((s) => s.featureKey !== 'yinTang')).toBe(true)
    expect(suggested.some((s) => s.featureKey === 'heartLine' && s.part === 'palm_l')).toBe(true)
    expect(suggested.some((s) => s.reason.includes('island_or_cross'))).toBe(true)
    expect(formatSuggestedLociBlock(suggested)).toContain('SuggestedLoci')
  })

  test('assessLociCoverage floors', () => {
    const thin = assessLociCoverage([
      { part: 'face', reading: '好' },
      { part: 'palm_l', reading: '好' },
    ])
    expect(thin.ok).toBe(false)

    const loci = []
    for (let i = 0; i < 5; i++) loci.push({ part: 'face', reading: `面${i}留意风险` })
    for (let i = 0; i < 5; i++) loci.push({ part: 'palm_l', reading: `左${i}` })
    for (let i = 0; i < 5; i++) loci.push({ part: 'palm_r', reading: `右${i}偏弱` })
    expect(assessLociCoverage(loci).ok).toBe(true)
  })
})
