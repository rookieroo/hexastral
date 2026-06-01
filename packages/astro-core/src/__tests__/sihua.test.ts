import { describe, expect, it } from 'bun:test'
import { annotateSiHua, findStarSiHua, getSiHua, getYearlySiHua, parseMutagen } from '../sihua'
import type { HeavenlyStem } from '../types'

describe('四化结构化 (SiHua)', () => {
  describe('getSiHua — 天干四化速查', () => {
    it('甲干: 廉贞禄, 破军权, 武曲科, 太阳忌', () => {
      const s = getSiHua('甲')
      expect(s.stem).toBe('甲')
      expect(s.lu.starName).toBe('廉贞')
      expect(s.lu.type).toBe('化禄')
      expect(s.lu.abbr).toBe('禄')
      expect(s.lu.nature).toBe('auspicious')
      expect(s.quan.starName).toBe('破军')
      expect(s.ke.starName).toBe('武曲')
      expect(s.ji.starName).toBe('太阳')
      expect(s.ji.nature).toBe('inauspicious')
    })

    it('乙干: 天机禄, 天梁权, 紫微科, 太阴忌', () => {
      const s = getSiHua('乙')
      expect(s.lu.starName).toBe('天机')
      expect(s.quan.starName).toBe('天梁')
      expect(s.ke.starName).toBe('紫微')
      expect(s.ji.starName).toBe('太阴')
    })

    it('丙干: 天同禄, 天机权, 文昌科, 廉贞忌', () => {
      const s = getSiHua('丙')
      expect(s.lu.starName).toBe('天同')
      expect(s.quan.starName).toBe('天机')
      expect(s.ke.starName).toBe('文昌')
      expect(s.ji.starName).toBe('廉贞')
    })

    it('丁干: 太阴禄, 天同权, 天机科, 巨门忌', () => {
      const s = getSiHua('丁')
      expect(s.lu.starName).toBe('太阴')
      expect(s.ji.starName).toBe('巨门')
    })

    it('戊干: 贪狼禄, 太阴权, 右弼科, 天机忌', () => {
      const s = getSiHua('戊')
      expect(s.lu.starName).toBe('贪狼')
      expect(s.ji.starName).toBe('天机')
    })

    it('己干: 武曲禄, 贪狼权, 天梁科, 文曲忌', () => {
      const s = getSiHua('己')
      expect(s.lu.starName).toBe('武曲')
      expect(s.ji.starName).toBe('文曲')
    })

    it('庚干: 太阳禄, 武曲权, 太阴科, 天同忌', () => {
      const s = getSiHua('庚')
      expect(s.lu.starName).toBe('太阳')
      expect(s.ji.starName).toBe('天同')
    })

    it('辛干: 巨门禄, 太阳权, 文曲科, 文昌忌', () => {
      const s = getSiHua('辛')
      expect(s.lu.starName).toBe('巨门')
      expect(s.ji.starName).toBe('文昌')
    })

    it('壬干: 天梁禄, 紫微权, 左辅科, 武曲忌', () => {
      const s = getSiHua('壬')
      expect(s.lu.starName).toBe('天梁')
      expect(s.ji.starName).toBe('武曲')
    })

    it('癸干: 破军禄, 巨门权, 太阴科, 贪狼忌', () => {
      const s = getSiHua('癸')
      expect(s.lu.starName).toBe('破军')
      expect(s.ji.starName).toBe('贪狼')
    })

    it('all 数组包含全部四化', () => {
      const s = getSiHua('甲')
      expect(s.all).toHaveLength(4)
      expect(s.all[0]).toBe(s.lu)
      expect(s.all[1]).toBe(s.quan)
      expect(s.all[2]).toBe(s.ke)
      expect(s.all[3]).toBe(s.ji)
    })

    it('所有十天干均有四化', () => {
      const stems: HeavenlyStem[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
      for (const stem of stems) {
        const s = getSiHua(stem)
        expect(s.all).toHaveLength(4)
        expect(s.lu.type).toBe('化禄')
        expect(s.quan.type).toBe('化权')
        expect(s.ke.type).toBe('化科')
        expect(s.ji.type).toBe('化忌')
      }
    })
  })

  describe('getYearlySiHua — 流年四化', () => {
    it('2024 = 甲辰年 → 甲干四化', () => {
      const r = getYearlySiHua(2024)
      expect(r.yearStem).toBe('甲')
      expect(r.sihua.lu.starName).toBe('廉贞')
    })

    it('2025 = 乙巳年 → 乙干四化', () => {
      const r = getYearlySiHua(2025)
      expect(r.yearStem).toBe('乙')
      expect(r.sihua.lu.starName).toBe('天机')
    })

    it('2026 = 丙午年 → 丙干四化', () => {
      const r = getYearlySiHua(2026)
      expect(r.yearStem).toBe('丙')
      expect(r.sihua.lu.starName).toBe('天同')
    })

    it('1984 = 甲子年 → 甲干四化', () => {
      const r = getYearlySiHua(1984)
      expect(r.yearStem).toBe('甲')
    })

    it('2000 = 庚辰年 → 庚干四化', () => {
      const r = getYearlySiHua(2000)
      expect(r.yearStem).toBe('庚')
      expect(r.sihua.lu.starName).toBe('太阳')
    })
  })

  describe('parseMutagen — iztro 裸字符串解析', () => {
    it('化禄 → SiHuaType', () => {
      expect(parseMutagen('化禄')).toBe('化禄')
    })

    it('化权 → SiHuaType', () => {
      expect(parseMutagen('化权')).toBe('化权')
    })

    it('化科 → SiHuaType', () => {
      expect(parseMutagen('化科')).toBe('化科')
    })

    it('化忌 → SiHuaType', () => {
      expect(parseMutagen('化忌')).toBe('化忌')
    })

    it('空字符串 → null', () => {
      expect(parseMutagen('')).toBeNull()
    })

    it('undefined → null', () => {
      expect(parseMutagen(undefined)).toBeNull()
    })

    it('null → null', () => {
      expect(parseMutagen(null)).toBeNull()
    })

    it('无关字符串 → null', () => {
      expect(parseMutagen('庙旺')).toBeNull()
    })

    it('带空格 → 正确解析', () => {
      expect(parseMutagen(' 化禄 ')).toBe('化禄')
    })
  })

  describe('findStarSiHua — 反查星曜四化', () => {
    it('廉贞 in 甲干 → 化禄', () => {
      const r = findStarSiHua('廉贞', '甲')
      expect(r).not.toBeNull()
      expect(r!.type).toBe('化禄')
    })

    it('太阳 in 甲干 → 化忌', () => {
      const r = findStarSiHua('太阳', '甲')
      expect(r).not.toBeNull()
      expect(r!.type).toBe('化忌')
    })

    it('紫微 in 甲干 → null (甲干紫微无四化)', () => {
      expect(findStarSiHua('紫微', '甲')).toBeNull()
    })

    it('紫微 in 乙干 → 化科', () => {
      const r = findStarSiHua('紫微', '乙')
      expect(r).not.toBeNull()
      expect(r!.type).toBe('化科')
    })
  })

  describe('annotateSiHua — 批量宫位标注', () => {
    it('返回正确的 Map 大小', () => {
      const palaces = [
        { majorStars: [{ name: '廉贞' }, { name: '破军' }], minorStars: [] },
        { majorStars: [{ name: '武曲' }], minorStars: [{ name: '太阳' }] },
      ]
      const map = annotateSiHua(palaces, '甲')
      // 甲干四化: 廉贞/破军/武曲/太阳 — 应有 4 个条目
      expect(map.size).toBe(4)
      expect(map.get('廉贞')!.type).toBe('化禄')
      expect(map.get('破军')!.type).toBe('化权')
      expect(map.get('武曲')!.type).toBe('化科')
      expect(map.get('太阳')!.type).toBe('化忌')
    })
  })
})
