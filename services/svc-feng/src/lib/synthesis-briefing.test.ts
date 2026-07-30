/**
 * Measurable gates for lean synthesis briefing (plan §5.2).
 */

import { describe, expect, test } from 'bun:test'
import {
  briefingContainsRawChartDump,
  buildSynthesisBriefing,
  SYNTHESIS_BRIEFING_MAX_CHARS,
  serializeSynthesisBriefing,
} from './synthesis-briefing'

describe('buildSynthesisBriefing', () => {
  test('serialized briefing ≤ 12k chars and omits raw chart dumps', () => {
    const briefing = buildSynthesisBriefing({
      vision: {
        形煞: Array.from({ length: 12 }, (_, i) => ({
          type: '路冲',
          direction: '巽',
          distance: 'near',
          severity: 3,
          evidence: `evidence-${i}-${'x'.repeat(40)}`,
          geometrySupport: 'strong',
        })),
        砂: [{ type: '来龙', direction: '乾', strength: 'medium' }],
        水: [{ type: '明堂', direction: '离', flow: 'in' }],
        朝案: [{ type: '案山', direction: '坎' }],
        notes: 'vision notes',
      },
      compute: {
        summary: { sit: '子', face: '午', buildYuanYun: 8, chartMethod: '下卦' },
        patterns: [{ kind: '旺山旺向', quality: 'auspicious' }],
        combinations: [
          {
            palace: '巽',
            mountainStar: 2,
            facingStar: 5,
            phase: '衰',
            name: '二五交加',
            domain: ['病'],
            reading: '重病孕妇性病（classical — must not appear public）',
            readingPublic: '传统上此宫双星组合偏煞象，研习上宜静不宜大动（非医疗/灾祸预测）',
          },
        ],
        formLi: {
          palaces: Array.from({ length: 8 }, (_, i) => ({
            palace: '坎艮震巽离坤兑乾'[i],
            findings: [{ verdict: '平', reason: 'x'.repeat(20) }],
          })),
        },
        baZhai: { concord: { concordant: true }, placement: {}, house: { gua: 1 }, person: null },
        auspiciousPalaces: ['巽'],
        inauspiciousPalaces: ['坤'],
        // Deliberately include keys that must NEVER leak into briefing
        flyingStars: {
          mountainChart: { 中: 8 },
          facingChart: { 中: 2 },
          periodChart: { 中: 8 },
        },
        annualChart: { mountainChart: { 中: 1 } },
      },
      dataQuality: {
        flyingStarsConfidence: 'medium',
        notes: ['street_sha_skipped_apartment=true'],
        hasExactBuildYear: false,
        inputScore: 72,
      },
      formLiNotes: {
        schemaVersion: 1,
        locale: 'zh',
        bullets: [
          {
            palace: '巽',
            seen: '近处路冲感',
            linkToChart: '对照二五交加',
            severity: 'watch',
          },
        ],
        omittedSignals: ['street_skipped_apartment'],
        inventedFacing: false,
      },
      userProfile: { birthDate: '1990-01-01', gender: '男', locale: 'zh' },
      memoryContext: 'm'.repeat(4000),
    })

    const serialized = serializeSynthesisBriefing(briefing)
    expect(serialized.length).toBeLessThanOrEqual(SYNTHESIS_BRIEFING_MAX_CHARS)
    expect(briefingContainsRawChartDump(serialized)).toBe(false)
    expect(serialized.includes('"mountainChart"')).toBe(false)
    expect(serialized.includes('readingPublic')).toBe(true)
    expect(serialized.includes('重病孕妇')).toBe(false)
  })
})
