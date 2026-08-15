/**
 * 择日宜忌释义 — 维基百科「黄历」条目 + 常用宜忌动词补充（见数据文件头）。
 */

import { hasYijiMeaning, YIJI_MEANING_GROUPS, yijiMeaning } from '../culture/yiji-meanings'

describe('yijiMeaning — 维基百科择日宜忌释义', () => {
  test('wiki 词条：纳采 / 斋醮（简繁同义）', () => {
    expect(yijiMeaning('纳采', 'zh-Hans')).toBe('提亲、说亲')
    expect(yijiMeaning('納採', 'zh-Hant')).toBe('提親、說親')
    expect(yijiMeaning('斋醮', 'zh-Hans')).toContain('斋戒')
    expect(yijiMeaning('齋醮', 'zh-Hant')).toContain('齋戒')
  })

  test('补充词条：嫁娶 / 开市', () => {
    expect(yijiMeaning('嫁娶', 'zh-Hans')).toContain('婚礼')
    expect(yijiMeaning('開市', 'zh-Hant')).toContain('營業')
  })

  test('未知词返回 null；hasYijiMeaning 判定', () => {
    expect(yijiMeaning('不存在的词', 'zh-Hans')).toBeNull()
    expect(hasYijiMeaning('出行')).toBe(true)
    expect(hasYijiMeaning('不存在的词')).toBe(false)
  })

  test('分组齐全（59 wiki + 29 补充 = 88）', () => {
    const all = [
      ...YIJI_MEANING_GROUPS.flatMap((g) => g.terms),
      '嫁娶',
      '开市',
      '立券',
      '交易',
      '纳财',
      '移徙',
      '见贵',
      '求财',
      '求嗣',
      '安香',
      '经络',
      '牧养',
      '纳畜',
      '捕捉',
      '畋猎',
      '取鱼',
      '栽种',
      '解除',
      '谢土',
      '上梁',
      '修饰垣墙',
      '入仓',
      '登高',
      '行船',
      '涂泥',
      '除服',
      '治病',
      '雕刻',
      '理发',
    ]
    for (const t of all) expect(hasYijiMeaning(t), t).toBe(true)
  })
})

describe('yijiMeaning — 术语国际卡（en/ja + 拼音）', () => {
  test('en = pinyin + English gloss', () => {
    expect(yijiMeaning('嫁娶', 'en')).toBe('jiàqǔ · Marriage — the wedding rites.')
    expect(yijiMeaning('纳采', 'en')).toContain('Betrothal gifts')
    expect(yijiMeaning('纳采', 'en')).toContain('nàcǎi')
  })
  test('ja = 读音 + 日文释义', () => {
    expect(yijiMeaning('嫁娶', 'ja')).toContain('結婚')
    expect(yijiMeaning('納採', 'ja')).toContain('婚約')
  })
  test('88 条全部有 en/ja 释义', () => {
    for (const t of YIJI_MEANING_GROUPS.flatMap((g) => g.terms)) {
      expect(yijiMeaning(t, 'en'), `en:${t}`).toContain('·')
      expect(yijiMeaning(t, 'ja'), `ja:${t}`).toBeTruthy()
    }
  })
})
