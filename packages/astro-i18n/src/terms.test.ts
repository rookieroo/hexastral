import { describe, expect, it } from 'vitest'
import { getTermByZh, segmentTextByTerms } from './terms'

/** Pull just the detected term tokens out of a segmentation. */
function terms(text: string, includeSingleChar = false): string[] {
  return segmentTextByTerms(text, { includeSingleChar })
    .filter((s) => s.termZh)
    .map((s) => s.termZh as string)
}

describe('segmentTextByTerms — multi-char (CJK default)', () => {
  it('detects multi-char domain terms', () => {
    expect(terms('两盘三合，需要用神通关')).toContain('三合')
    expect(terms('两盘三合，需要用神通关')).toContain('用神')
  })

  it('does NOT detect single 干支/五行 or compounds (the CJK reading stays clean)', () => {
    // 己土 / 甲戌 / 卯 all pass through as plain text for a CJK reader.
    expect(terms('甲方己土坐卯木，四柱甲戌')).toEqual([])
  })

  it('round-trips the full text losslessly', () => {
    const src = '己土受乙木克制，三合增益'
    expect(
      segmentTextByTerms(src)
        .map((s) => s.text)
        .join('')
    ).toBe(src)
  })
})

describe('segmentTextByTerms — includeSingleChar (non-CJK readers)', () => {
  it('detects single 五行/天干/地支 primitives', () => {
    expect(terms('controlled by 卯 and 土', true)).toEqual(['卯', '土'])
  })

  it('detects the day-master spelling 己土 / 乙木 as ONE unit, not two', () => {
    expect(terms('your 己土 meets their 乙木', true)).toEqual(['己土', '乙木'])
  })

  it('detects 干支 pillars as units — 甲戌 庚午, not 甲/戌/庚/午', () => {
    expect(terms('the four pillars 甲戌 庚午 己卯 丙寅', true)).toEqual([
      '甲戌',
      '庚午',
      '己卯',
      '丙寅',
    ])
  })

  it('still detects multi-char terms alongside primitives', () => {
    const got = terms('己土 in 三合 with 用神', true)
    expect(got).toContain('己土')
    expect(got).toContain('三合')
    expect(got).toContain('用神')
  })

  it('round-trips losslessly with compounds + singles', () => {
    const src = 'your 己土 vs 乙木, pillar 甲戌, branch 卯'
    expect(
      segmentTextByTerms(src, { includeSingleChar: true })
        .map((s) => s.text)
        .join('')
    ).toBe(src)
  })
})

describe('getTermByZh — table + compound resolution', () => {
  it('① resolves the newly-added 五行 relation 比和', () => {
    const t = getTermByZh('比和', 'en')
    expect(t).not.toBeNull()
    expect(t?.short.length).toBeGreaterThan(0)
  })

  it('resolves single primitives with their meaning', () => {
    expect(getTermByZh('卯', 'en')?.short).toMatch(/rabbit/i)
    expect(getTermByZh('土', 'en')?.short).toMatch(/steady|earth|ground/i)
  })

  it('③ day-master spelling 己土 → the stem 己 meaning, label kept as 己土', () => {
    const dm = getTermByZh('己土', 'en')
    const stem = getTermByZh('己', 'en')
    expect(dm?.zh).toBe('己土')
    expect(dm?.short).toBe(stem?.short)
    expect(dm?.long).toBe(stem?.long)
  })

  it('③ 干支 pillar 甲戌 → composed stem-over-branch bubble', () => {
    const p = getTermByZh('甲戌', 'en')
    expect(p?.zh).toBe('甲戌')
    expect(p?.short).toBe('one of the four pillars')
    // long names both the stem (甲) and the branch (戌)
    expect(p?.long).toContain('甲')
    expect(p?.long).toContain('戌')
  })

  it('rejects non-compounds: 甲土 (wrong element) and 木卯 (not stem-led) → null', () => {
    expect(getTermByZh('甲土', 'en')).toBeNull() // 甲 is Wood, not Earth → not a day-master form
    expect(getTermByZh('木卯', 'en')).toBeNull() // leads with an element, not a stem
  })

  it('resolves the pillar in the reader locale (zh framing)', () => {
    expect(getTermByZh('甲戌', 'zh')?.short).toBe('四柱之一')
  })
})
