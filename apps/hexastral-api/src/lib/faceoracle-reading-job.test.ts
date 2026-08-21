import { describe, expect, test } from 'bun:test'
import {
  formatPreviousBriefBlock,
  normalizeFaceoracleInterpretation,
} from './faceoracle-reading-job'

describe('normalizeFaceoracleInterpretation', () => {
  test('accepts layered chapters', () => {
    const out = normalizeFaceoracleInterpretation(
      {
        chapters: [
          {
            kind: 'overview',
            goldenLine: '气机宜留意节律',
            evidence: '面相与八字对照显示本期宜静观。',
            dynamic: '情绪波动可能加大',
            reef: null,
            remedy: '留观察窗口',
            counterpoint: '非命运断语',
          },
          {
            kind: 'face',
            goldenLine: '骨相沉稳',
            evidence: '面部骨相沉稳，眼神内敛。',
            dynamic: '',
            reef: null,
            remedy: null,
            counterpoint: null,
          },
        ],
        events: [],
      },
      'zh'
    )
    expect(out).not.toBeNull()
    expect(out!.chapters.length).toBeGreaterThanOrEqual(2)
    expect(out!.flat.overview).toContain('宜静观')
  })

  test('adapts flat legacy keys', () => {
    const out = normalizeFaceoracleInterpretation(
      {
        overview: '本期形气总体平和，宜留意作息节奏与情绪边界。',
        faceSection: '面部特征显示沉稳内敛的气质线索，适合对照八字理解。',
        advice: '重要决定可多留观察窗口，不必急于断语。',
        events: [],
      },
      'zh'
    )
    expect(out).not.toBeNull()
    expect(out!.chapters.some((c) => c.kind === 'overview')).toBe(true)
  })

  test('rejects empty body', () => {
    const out = normalizeFaceoracleInterpretation({ overview: '短', events: [] }, 'zh')
    expect(out).toBeNull()
  })

  test('drops events past horizonMonths', () => {
    const out = normalizeFaceoracleInterpretation(
      {
        overview: '本期形气总体平和，宜留意作息节奏与情绪边界。',
        faceSection: '面部特征显示沉稳内敛的气质线索，适合对照八字理解。',
        advice: '重要决定可多留观察窗口，不必急于断语。',
        events: [
          { startMonth: '2099-01', endMonth: '2099-03', theme: 'far' },
          { startMonth: '2020-01', endMonth: '2020-03', theme: 'past' },
        ],
      },
      'zh',
      { horizonMonths: 3 }
    )
    expect(out).not.toBeNull()
    expect(out!.flat.events).toEqual([])
  })
})

describe('formatPreviousBriefBlock', () => {
  test('compacts prior brief fields', () => {
    const block = formatPreviousBriefBlock(
      JSON.stringify({
        brief: {
          title: '旧标题',
          excerpt: '旧摘录',
          summary: '旧摘要一二三',
          points: ['点1', '点2'],
        },
        events: [{ theme: '旧窗' }],
      })
    )
    expect(block).toContain('title=旧标题')
    expect(block).toContain('summary=旧摘要')
    expect(block).toContain('points=点1')
    expect(block).toContain('windows=旧窗')
  })

  test('returns null without brief', () => {
    expect(formatPreviousBriefBlock(JSON.stringify({ chapters: [] }))).toBeNull()
  })
})
