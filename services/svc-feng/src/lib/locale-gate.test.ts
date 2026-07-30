import { describe, expect, test } from 'bun:test'
import { fengBodyLooksWrongLocale, fengChaptersLocaleOk, fengCjkRatio } from './locale-gate'

describe('feng locale gate', () => {
  test('en rejects Chinese-heavy prose', () => {
    const zh =
      '外峦头形势显示巽宫有路冲，坤宫砂高，来龙在乾，水口在兑，应当谨慎化解并调整室内布局。'.repeat(
        2
      )
    expect(fengBodyLooksWrongLocale('en', zh)).toBe(true)
  })

  test('en allows classical terms embedded in English', () => {
    const en =
      'The exterior landform shows a road sha toward 巽. Sit 子 face 午 uses 下卦. Prefer quiet adjustments in the 坤 palace this period.'
    expect(fengCjkRatio(en)).toBeLessThan(0.18)
    expect(fengBodyLooksWrongLocale('en', en)).toBe(false)
  })

  test('ja rejects Han-only without kana', () => {
    const zhOnly =
      '外峦头形势显示巽宫有路冲坤宫砂高来龙在乾水口在兑应当谨慎化解并调整室内布局注意形煞。'.repeat(
        2
      )
    expect(fengBodyLooksWrongLocale('ja', zhOnly)).toBe(true)
  })

  test('chapters helper returns rewrite suffix', () => {
    const result = fengChaptersLocaleOk('en', [
      {
        kind: 'external_landform',
        title: '外峦头',
        goldenLine: '形势不佳',
        body: '外峦头形势显示巽宫有路冲，坤宫砂高，来龙在乾，水口在兑，应当谨慎化解并调整室内布局。'.repeat(
          2
        ),
      },
    ] as never)
    expect(result.ok).toBe(false)
  })
})
