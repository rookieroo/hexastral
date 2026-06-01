/**
 * 八宅 golden tests.
 *
 * Coverage:
 * 1. mingGuaForYearGender — known birth years for 男 / 女
 * 2. 5 substitution: 男5→坤(2), 女5→艮(8)
 * 3. dateToMingGuaYear — 立春 boundary
 * 4. eastWestGroup classification
 * 5. luckyDirections / unluckyDirections completeness + 4-direction order
 * 6. baZhaiFit scoring sanity
 * 7. computeBaZhai end-to-end driver
 */

import { describe, expect, test } from 'bun:test'
import {
  baZhaiFit,
  computeBaZhai,
  dateToMingGuaYear,
  eastWestGroup,
  luckyDirections,
  mingGuaForYearGender,
  unluckyDirections,
} from '../../feng/ba-zhai'

describe('mingGuaForYearGender — published cases', () => {
  // Pen-and-paper derivations:
  //   1985: 1+9+8+5 = 23 → 2+3 = 5
  //     男: (11-5)%9 = 6 → 乾
  //     女: (5+4)%9 = 0 → 9 → 离
  //   1990: 1+9+9+0 = 19 → 1+9 = 10 → 1
  //     男: (11-1)%9 = 10%9 = 1 → 坎
  //     女: (1+4)%9 = 5 → substituted to 8 → 艮
  //   2000: 2+0+0+0 = 2
  //     男: (11-2)%9 = 0 → 9 → 离
  //     女: (2+4)%9 = 6 → 乾

  test('1985男 → 乾', () => expect(mingGuaForYearGender(1985, '男')).toBe('乾'))
  test('1985女 → 离', () => expect(mingGuaForYearGender(1985, '女')).toBe('离'))
  test('1990男 → 坎', () => expect(mingGuaForYearGender(1990, '男')).toBe('坎'))
  test('1990女 → 艮 (5→8 substitution)', () => expect(mingGuaForYearGender(1990, '女')).toBe('艮'))
  test('2000男 → 离', () => expect(mingGuaForYearGender(2000, '男')).toBe('离'))
  test('2000女 → 乾', () => expect(mingGuaForYearGender(2000, '女')).toBe('乾'))

  test('1956男 lands on raw 5 → 坤 (male substitution)', () => {
    // 1956: 1+9+5+6 = 21 → 3. 男: (11-3)%9 = 8 → 艮. Not the 5 case.
    // Need a year with root 6 for 男: (11-6)=5 → 男 substitution → 坤
    // Year root 6: 1959 → 1+9+5+9 = 24 → 6 ✓
    expect(mingGuaForYearGender(1959, '男')).toBe('坤')
  })
})

describe('dateToMingGuaYear (立春 boundary)', () => {
  test('Jan 20, 1990 → 1989', () => {
    expect(dateToMingGuaYear(new Date(1990, 0, 20))).toBe(1989)
  })
  test('Feb 3, 1990 → 1989', () => {
    expect(dateToMingGuaYear(new Date(1990, 1, 3))).toBe(1989)
  })
  test('Feb 4, 1990 → 1990', () => {
    expect(dateToMingGuaYear(new Date(1990, 1, 4))).toBe(1990)
  })
  test('Mar 1, 1990 → 1990', () => {
    expect(dateToMingGuaYear(new Date(1990, 2, 1))).toBe(1990)
  })
})

describe('eastWestGroup', () => {
  test('坎离震巽 are 东四命', () => {
    expect(eastWestGroup('坎')).toBe('东四命')
    expect(eastWestGroup('离')).toBe('东四命')
    expect(eastWestGroup('震')).toBe('东四命')
    expect(eastWestGroup('巽')).toBe('东四命')
  })
  test('乾坤艮兑 are 西四命', () => {
    expect(eastWestGroup('乾')).toBe('西四命')
    expect(eastWestGroup('坤')).toBe('西四命')
    expect(eastWestGroup('艮')).toBe('西四命')
    expect(eastWestGroup('兑')).toBe('西四命')
  })
})

describe('luckyDirections / unluckyDirections — pairings', () => {
  test('坎命: 生气=巽, 天医=震, 延年=离, 伏位=坎', () => {
    const l = luckyDirections('坎')
    expect(l.map((d) => [d.kind, d.palace])).toEqual([
      ['生气', '巽'],
      ['天医', '震'],
      ['延年', '离'],
      ['伏位', '坎'],
    ])
  })

  test('坎命: 绝命=坤, 五鬼=艮, 六煞=乾, 祸害=兑', () => {
    const u = unluckyDirections('坎')
    expect(u.map((d) => [d.kind, d.palace])).toEqual([
      ['绝命', '坤'],
      ['五鬼', '艮'],
      ['六煞', '乾'],
      ['祸害', '兑'],
    ])
  })

  test('乾命: 生气=兑, 绝命=离', () => {
    expect(luckyDirections('乾')[0]).toMatchObject({ kind: '生气', palace: '兑' })
    expect(unluckyDirections('乾')[0]).toMatchObject({ kind: '绝命', palace: '离' })
  })

  test('every 命卦 has 4 lucky + 4 unlucky', () => {
    const all = ['坎', '离', '震', '巽', '乾', '坤', '艮', '兑'] as const
    for (const g of all) {
      expect(luckyDirections(g)).toHaveLength(4)
      expect(unluckyDirections(g)).toHaveLength(4)
    }
  })

  test('lucky + unlucky cover all 8 palaces with no overlap', () => {
    const all = ['坎', '离', '震', '巽', '乾', '坤', '艮', '兑'] as const
    for (const g of all) {
      const palaces = [
        ...luckyDirections(g).map((d) => d.palace),
        ...unluckyDirections(g).map((d) => d.palace),
      ].sort()
      expect(palaces).toEqual([...all].sort())
    }
  })
})

describe('baZhaiFit', () => {
  test('坎命 + 坐巽(生气) + 门震(天医) → high score, auspicious', () => {
    const fit = baZhaiFit({ mingGua: '坎', sitPalace: '巽', doorPalace: '震' })
    expect(fit.verdict).toBe('auspicious')
    expect(fit.score).toBeGreaterThanOrEqual(80)
    expect(fit.sitVerdict.kind).toBe('生气')
    expect(fit.doorVerdict.kind).toBe('天医')
  })

  test('坎命 + 坐坤(绝命) + 门艮(五鬼) → very low score, inauspicious', () => {
    const fit = baZhaiFit({ mingGua: '坎', sitPalace: '坤', doorPalace: '艮' })
    expect(fit.verdict).toBe('inauspicious')
    expect(fit.score).toBeLessThanOrEqual(20)
  })

  test('坎命 + 坐离(延年) + 门兑(祸害) → mixed verdict', () => {
    const fit = baZhaiFit({ mingGua: '坎', sitPalace: '离', doorPalace: '兑' })
    expect(fit.verdict).toBe('mixed')
  })
})

describe('computeBaZhai end-to-end', () => {
  test('1990 男 born March → 坎命, full payload', () => {
    const r = computeBaZhai({
      birthDate: new Date(1990, 2, 15),
      gender: '男',
    })
    expect(r.mingGua).toBe('坎')
    expect(r.group).toBe('东四命')
    expect(r.lucky).toHaveLength(4)
    expect(r.unlucky).toHaveLength(4)
    expect(r.fit).toBeUndefined() // no building info supplied
  })

  test('with building info, includes fit', () => {
    const r = computeBaZhai({
      birthDate: new Date(1990, 2, 15),
      gender: '男',
      sitPalace: '巽',
      doorPalace: '震',
    })
    expect(r.fit).toBeDefined()
    expect(r.fit?.verdict).toBe('auspicious')
  })

  test('Jan birth → previous-year 立春 → potentially different 命卦', () => {
    // Born Jan 1990 → 立春-year = 1989: digit root 1+9+8+9 = 27 → 9
    //   男: (11-9)%9 = 2 → 坤
    const r = computeBaZhai({ birthDate: new Date(1990, 0, 15), gender: '男' })
    expect(r.mingGua).toBe('坤')
  })
})
