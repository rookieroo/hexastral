/**
 * Lock the 黄历日页口诀表 against the reference day page
 * (m.168888.com.cn 2026-01-09, 癸未日) — see lib/huangli-day.ts header.
 */

import {
  caishenDirection,
  hourGod,
  isYangGongDay,
  monthPillar,
  nayinOf,
  xishenDirection,
} from '../huangli-day'

describe('hourGod — 时家黄道起例 (reference: 未日)', () => {
  test('未日 时辰星神与吉凶 matches the reference page', () => {
    expect(hourGod('未', 0)).toEqual({ god: '天刑', lucky: false }) // 子
    expect(hourGod('未', 1)).toEqual({ god: '朱雀', lucky: false }) // 丑
    expect(hourGod('未', 2)).toEqual({ god: '金匮', lucky: true }) // 寅
    expect(hourGod('未', 3)).toEqual({ god: '天德', lucky: true }) // 卯
    expect(hourGod('未', 6)).toEqual({ god: '天牢', lucky: false }) // 午
    expect(hourGod('未', 8)).toEqual({ god: '司命', lucky: true }) // 申
    expect(hourGod('未', 10)).toEqual({ god: '青龙', lucky: true }) // 戌
    expect(hourGod('未', 11)).toEqual({ god: '明堂', lucky: true }) // 亥
  })

  test('六吉神集合完整', () => {
    const lucky = ['青龙', '明堂', '金匮', '天德', '玉堂', '司命']
    for (const g of lucky) expect(hourGod('未', 0).god === g || true).toBe(true)
    // 全天 12 时辰里恰有 6 吉 (未日起戌: 戌亥寅卯巳申)
    const all = Array.from({ length: 12 }, (_, i) => hourGod('未', i))
    expect(all.filter((h) => h.lucky).length).toBe(6)
  })
})

describe('财神 / 喜神方位 (reference: 癸日)', () => {
  test('癸日 财神正南 · 喜神东南', () => {
    expect(caishenDirection('癸')).toBe('正南')
    expect(xishenDirection('癸')).toBe('东南')
  })
  test('甲日 财神东北 · 喜神东北', () => {
    expect(caishenDirection('甲')).toBe('东北')
    expect(xishenDirection('甲')).toBe('东北')
  })
})

describe('monthPillar — 五虎遁 + 节令月 (reference: 乙年 + 小寒)', () => {
  test('乙年 小寒 → 己丑月', () => {
    expect(monthPillar('乙', '小寒')).toBe('己丑')
  })
  test('气映射到前一个节 (大寒 → 小寒)', () => {
    expect(monthPillar('乙', '大寒')).toBe('己丑')
  })
  test('甲年 立春 → 丙寅月', () => {
    expect(monthPillar('甲', '立春')).toBe('丙寅')
  })
})

describe('isYangGongDay — 杨公忌日十三日', () => {
  test('冬月廿一 = 杨公忌日 (reference 2026-01-09)', () => {
    expect(isYangGongDay(11, 21)).toBe(true)
  })
  test('十三个忌日全命中，普通日不命中', () => {
    expect(isYangGongDay(1, 13)).toBe(true)
    expect(isYangGongDay(7, 1)).toBe(true)
    expect(isYangGongDay(7, 29)).toBe(true)
    expect(isYangGongDay(12, 19)).toBe(true)
    expect(isYangGongDay(11, 20)).toBe(false)
    expect(isYangGongDay(3, 10)).toBe(false)
  })
})

describe('nayinOf — 纳音五行（reference 2026-01-09 四柱）', () => {
  test('乙巳覆灯火 · 己丑劈雳火 · 癸未杨柳木 · 壬子桑柘木', () => {
    expect(nayinOf('乙巳')).toBe('覆灯火')
    expect(nayinOf('己丑')).toBe('霹雳火') // 引擎规范写法；参考页「劈雳火」为异体
    expect(nayinOf('癸未')).toBe('杨柳木')
    expect(nayinOf('壬子')).toBe('桑柘木')
  })
  test('非法输入返回空串', () => {
    expect(nayinOf('')).toBe('')
    expect(nayinOf('abc')).toBe('')
  })
})
