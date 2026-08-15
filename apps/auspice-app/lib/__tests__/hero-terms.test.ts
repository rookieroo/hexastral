import { HERO_TERM_KEYS, heroTermExplanation } from '../culture/hero-terms'

describe('heroTermExplanation — Hero 行话四语解释层', () => {
  test('岁次 四语齐备', () => {
    expect(heroTermExplanation('岁次', 'zh-Hans')).toContain('六十年一轮回')
    expect(heroTermExplanation('岁次', 'zh-Hant')).toContain('六十年一輪回')
    expect(heroTermExplanation('岁次', 'ja')).toContain('60年')
    expect(heroTermExplanation('岁次', 'en')).toContain('60-year')
  })

  test('干支 / 建除 / 值神 / 冲煞 可解释', () => {
    expect(heroTermExplanation('干支', 'zh-Hans')).toContain('六十甲子')
    expect(heroTermExplanation('建除', 'zh-Hans')).toContain('十二建星')
    expect(heroTermExplanation('值神', 'zh-Hans')).toContain('黄道')
    expect(heroTermExplanation('冲煞', 'en')).toContain('clash')
  })

  test('非 hero 词返回 null；11 个键全覆盖四语', () => {
    expect(heroTermExplanation('不存在', 'zh-Hans')).toBeNull()
    expect(HERO_TERM_KEYS.length).toBe(11)
    for (const k of HERO_TERM_KEYS) {
      for (const loc of ['zh-Hans', 'zh-Hant', 'ja', 'en']) {
        expect(heroTermExplanation(k, loc), `${k}@${loc}`).toBeTruthy()
      }
    }
  })
})
