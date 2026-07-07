/**
 * Golden tests for classical (non-LLM) yiching readings.
 */

import { describe, expect, test } from 'bun:test'
import { getHexagramByLines } from '../../data/hexagrams'
import { castHexagram, generateClassicalReading } from './cast'

describe('generateClassicalReading', () => {
  test('returns corpus fields without LLM for a static hexagram', () => {
    const yaoValues = [7, 8, 9, 6, 7, 8] as const
    const lines = yaoValues.map((v) => (v % 2 === 1 ? 1 : 0))
    const changingLines = yaoValues.map((v, i) => (v === 6 || v === 9 ? i : -1)).filter((i) => i >= 0)

    const hexagram = getHexagramByLines(lines)
    expect(hexagram).not.toBeNull()

    const hexagramResult = castHexagram(lines, changingLines)
    expect(hexagramResult).not.toBeNull()

    const reading = generateClassicalReading(hexagram!, changingLines)

    expect(reading.interpretation).toContain(hexagram!.judgmentExplain)
    expect(reading.summary).toBe(hexagram!.keywords.join('·'))
    expect(reading.advice).toBe('')
    expect(reading.fortune).toBe(hexagram!.fortune)
    expect(reading.classical.judgment).toBe(hexagram!.judgment)
    expect(reading.classical.image).toBe(hexagram!.image)
    expect(reading.classical.lines).toHaveLength(6)
    expect(reading.classical.changingLineTexts.length).toBe(changingLines.length)
    expect(hexagramResult!.changingLines).toEqual(changingLines)
  })

  test('includes naJiaContext when provided', () => {
    const lines = [1, 1, 1, 1, 1, 1]
    const hexagram = getHexagramByLines(lines)
    expect(hexagram).not.toBeNull()

    const naJia = '本卦：乾为天 属乾宫'
    const reading = generateClassicalReading(hexagram!, [], naJia)

    expect(reading.classical.naJiaContext).toBe(naJia)
  })

  test('returns English judgmentExplain when language is en', () => {
    const lines = [1, 1, 1, 1, 1, 1]
    const hexagram = getHexagramByLines(lines)
    expect(hexagram).not.toBeNull()

    const readingZh = generateClassicalReading(hexagram!, [], '', 'zh-CN')
    const readingEn = generateClassicalReading(hexagram!, [], '', 'en')

    expect(readingEn.interpretation).toContain('Qian represents')
    expect(readingEn.interpretation).not.toBe(readingZh.interpretation)
    expect(readingEn.summary).toContain('vigor')
  })
})
