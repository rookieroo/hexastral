import { describe, expect, test } from 'vitest'
import { OFFICER_YIJI } from '../almanac'
import {
  defaultYijiModeForLocale,
  formatYijiList,
  formatYijiVerb,
  officerYijiCanonicalTerms,
  resolveYijiSearchVerbs,
  YIJI_EVENT_VERBS,
  YIJI_EVENTS,
  yijiExplainField,
} from '../yiji-vocabulary'

describe('yiji-vocabulary', () => {
  const terms = officerYijiCanonicalTerms()
  const locales = ['zh-Hans', 'zh-Hant', 'ja', 'en'] as const
  const modes = ['traditional', 'modern'] as const

  test('covers every OFFICER_YIJI verb (35 unique)', () => {
    expect(terms.length).toBe(35)
    for (const row of Object.values(OFFICER_YIJI)) {
      for (const v of [...row.good, ...row.bad]) {
        expect(terms).toContain(v)
      }
    }
  })

  test('four locales × two modes produce a non-empty label for every canonical term', () => {
    for (const loc of locales) {
      for (const mode of modes) {
        for (const v of terms) {
          const label = formatYijiVerb(v, loc, mode)
          expect(label.length).toBeGreaterThan(0)
          // zh modern: prefer ≤3 CJK characters
          if (mode === 'modern' && (loc === 'zh-Hans' || loc === 'zh-Hant')) {
            expect([...label].length).toBeLessThanOrEqual(3)
          }
        }
      }
    }
  })

  test('unknown verb falls back to source', () => {
    expect(formatYijiVerb('不存在的词', 'en', 'modern')).toBe('不存在的词')
  })

  test('formatYijiList dedupes and caps', () => {
    expect(formatYijiList(['嫁娶', '嫁娶', '出行'], 'zh-Hans', 'modern', 2)).toBe('结婚·出行')
    expect(formatYijiList(['开市', '立券'], 'en', 'modern')).toContain(' · ')
  })

  test('defaultYijiModeForLocale', () => {
    expect(defaultYijiModeForLocale('en')).toBe('modern')
    expect(defaultYijiModeForLocale('en-US')).toBe('modern')
    expect(defaultYijiModeForLocale('zh-Hans')).toBe('traditional')
    expect(defaultYijiModeForLocale('zh-Hant')).toBe('traditional')
    expect(defaultYijiModeForLocale('ja')).toBe('traditional')
  })

  test('YIJI_EVENTS verbs are stable for scoring', () => {
    expect(YIJI_EVENTS).toHaveLength(10)
    expect(YIJI_EVENT_VERBS.wedding).toEqual(['嫁娶'])
  })

  test('hot-word aliases resolve without mutating OFFICER_YIJI', () => {
    expect(resolveYijiSearchVerbs('相亲')?.event).toBe('wedding')
    expect(resolveYijiSearchVerbs('读书')?.verbs).toEqual(['入学'])
    expect(resolveYijiSearchVerbs('进修')?.verbs).toEqual(['入学'])
    expect(resolveYijiSearchVerbs('面试')?.verbs).toEqual(['见贵', '求财'])
    expect(resolveYijiSearchVerbs('AI')?.verbs).toEqual(['入学', '求财'])
    expect(resolveYijiSearchVerbs('游戏')?.verbs).toEqual(['祈福', '沐浴'])
    expect(resolveYijiSearchVerbs('unknown-alias')).toBeNull()
  })

  test('explain field is always canonical CJK', () => {
    expect(yijiExplainField('good', '嫁娶')).toBe('宜 嫁娶')
    expect(yijiExplainField('avoid', '动土')).toBe('忌 动土')
  })
})
