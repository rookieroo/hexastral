import { describe, expect, it } from 'bun:test'
import { deriveReportDigest } from './report-digest'
import type { FengComputeJson } from '../types'

/** Minimal compute stub — only fields read by deriveReportDigest. */
function stubCompute(): FengComputeJson {
  return {
    flyingStars: {
      buildYuanYun: { yuanYun: 8, startYear: 2004, endYear: 2023 },
      currentYuanYun: { yuanYun: 9, startYear: 2024, endYear: 2043 },
      sitMountain: { name: '子', palace: '坎' },
      faceMountain: { name: '午', palace: '离' },
      chartMethod: '下卦',
    },
    patterns: [{ kind: '双星会向', quality: 'auspicious', note: 'test' }],
    baZhai: {
      concord: { concordant: true, verdict: '宅命相配', advice: 'test' },
    },
    formLi: {
      palaces: [
        {
          palace: '巽',
          findings: [{ verdict: '动凶', reason: 'a' }, { verdict: '破财', reason: 'b' }],
        },
        {
          palace: '离',
          findings: [{ verdict: '动凶', reason: 'c' }],
        },
      ],
      zhengLing: { findings: [] },
      patternRescue: [],
    },
  } as unknown as FengComputeJson
}

describe('deriveReportDigest', () => {
  it('dedupes exterior sha by palace', () => {
    const digest = deriveReportDigest(stubCompute())
    expect(digest?.exterior.shaCount).toBe(2)
    expect(digest?.exterior.tier).toBe('sha_light')
  })

  it('prefers vision sha count when provided', () => {
    const digest = deriveReportDigest(stubCompute(), 'high', { visionShaCount: 4 })
    expect(digest?.exterior.shaCount).toBe(4)
    expect(digest?.exterior.tier).toBe('sha_heavy')
  })

  it('prioritizes malefic focus in headline', () => {
    const digest = deriveReportDigest(stubCompute())
    expect(digest?.headline.type).toBe('focus')
    if (digest?.headline.type === 'focus') {
      expect(digest.headline.verdict).toBe('动凶')
    }
  })
})
