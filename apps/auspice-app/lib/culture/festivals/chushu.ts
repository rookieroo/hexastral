import type { FestivalContent } from './schema'

/**
 * 处暑 — 节气. Structure 物候(三候)/农事/养生/诗. 诗: 元稹《咏廿四气诗·处暑》
 * (「向来鹰祭鸟，渐觉白藏深」). CJK literal, en explained (ADR-0020).
 */
export const CHUSHU: FestivalContent = {
  id: 'jieqi-chushu',
  kind: 'jieqi',
  name: {
    'zh-Hans': '处暑',
    'zh-Hant': '處暑',
    ja: '処暑',
    en: 'Chushu (End of Heat)',
  },
  tagline: {
    'zh-Hans': '二十四节气之十四 · 暑气至此而止',
    'zh-Hant': '二十四節氣之十四 · 暑氣至此而止',
    ja: '二十四節気の第十四 · 暑さが収まる頃',
    en: 'The 14th solar term · here the heat stops',
  },
  sections: {
    'zh-Hans': [
      {
        title: '物候',
        body: '处暑三候——「一候鹰乃祭鸟，二候天地始肃，三候禾乃登」。鹰开始大量捕鸟陈列如祭，天地间肃杀之气渐显，黍稷稻粱等谷物成熟登场。「处」者，止也，处暑即「暑气至此而止」，炎热渐退。',
      },
      {
        title: '农事',
        body: '处暑是秋收秋种的过渡。农谚「处暑满地黄，家家修廪仓」。北方忙于秋收准备，南方晚稻抽穗灌浆需防「寒露风」。此时仍需防旱抗涝、防治病虫，棉花与晚稻的田间管理尤为关键。',
      },
      {
        title: '养生',
        body: '处暑暑去秋来、昼热夜凉，中医主张防「秋燥」、护脾胃、敛阳气。饮食宜清润（银耳、莲子、百合、梨、鸭肉），少食辛燥油腻。起居宜早睡早起、适当午休以解「秋乏」。情志宜舒畅安宁。早晚转凉，注意添衣护腹，预防肠胃与呼吸道不适。',
      },
      {
        title: '诗',
        body: '元稹《咏廿四气诗·处暑》写暑退秋深：「向来鹰祭鸟，渐觉白藏深。叶下空惊吹，天高不见心。」——鹰已开始祭鸟之候，秋意（白藏，秋之别称）渐深。落叶在风中空自惊飞，天高云淡却不见尽处。诗人以鹰、叶、高天写处暑由暑入秋的清旷与寂寥。',
      },
    ],
    'zh-Hant': [
      {
        title: '物候',
        body: '處暑三候——「一候鷹乃祭鳥，二候天地始肅，三候禾乃登」。鷹開始大量捕鳥陳列如祭，天地間肅殺之氣漸顯，黍稷稻粱等穀物成熟登場。「處」者，止也，處暑即「暑氣至此而止」，炎熱漸退。',
      },
      {
        title: '農事',
        body: '處暑是秋收秋種的過渡。農諺「處暑滿地黃，家家修廩倉」。北方忙於秋收準備，南方晚稻抽穗灌漿需防「寒露風」。此時仍需防旱抗澇、防治病蟲，棉花與晚稻的田間管理尤為關鍵。',
      },
      {
        title: '養生',
        body: '處暑暑去秋來、晝熱夜涼，中醫主張防「秋燥」、護脾胃、斂陽氣。飲食宜清潤（銀耳、蓮子、百合、梨、鴨肉），少食辛燥油膩。起居宜早睡早起、適當午休以解「秋乏」。情志宜舒暢安寧。早晚轉涼，注意添衣護腹，預防腸胃與呼吸道不適。',
      },
      {
        title: '詩',
        body: '元稹《詠廿四氣詩·處暑》寫暑退秋深：「向來鷹祭鳥，漸覺白藏深。葉下空驚吹，天高不見心。」——鷹已開始祭鳥之候，秋意（白藏，秋之別稱）漸深。落葉在風中空自驚飛，天高雲淡卻不見盡處。詩人以鷹、葉、高天寫處暑由暑入秋的清曠與寂寥。',
      },
    ],
    ja: [
      {
        title: '物候',
        body: '処暑の三候——「一候 鷹乃ち鳥を祭る、二候 天地始めて粛（しゅく）たり、三候 禾（か）乃ち登る」。鷹が鳥を多く捕えて祭るがごとく並べ、天地のあいだに粛殺の気が現れ始め、黍・稷・稲・粱などの穀物が実って取り入れの時を迎える。「処」は止まるの意で、処暑は「暑気 此に至りて止む」、炎熱が次第に退く。',
      },
      {
        title: '農事',
        body: '処暑は秋の収穫と種まきの過渡である。「処暑 地に満ちて黄ばみ、家ごとに廩倉（こめぐら）を修む」と農諺に言う。北方では秋収の備えに忙しく、南方では晩稲が穂を出し実を充たし、「寒露風」を防ぐ。なお旱・澇を防ぎ病虫を防除する必要があり、棉花・晩稲の田の管理がとりわけ肝要である。',
      },
      {
        title: '養生',
        body: '処暑は暑が去り秋が来て、昼は暑く夜は涼しい。漢方では「秋燥」を防ぎ、脾胃を護り、陽気を収めることを説く。食は清らかに潤すもの（白きくらげ・蓮の実・百合・梨・鴨肉）を宜とし、辛燥・脂を控える。早寝早起きし、適度な昼休みで「秋の倦（だる）さ」を解く。情を伸びやかに安らかに保つ。朝晩は涼しくなるため、衣を足し腹を護り、胃腸と呼吸器の不調を予防する。',
      },
      {
        title: '詩',
        body: '元稹「廿四気を詠ずる詩・処暑」は暑の退き秋の深まりを詠む：「向来 鷹 鳥を祭り、漸く覚ゆ 白蔵の深きを。葉下 空しく吹に驚き、天高くして心を見ず。」——鷹はすでに鳥を祭る候に入り、秋の気（白蔵は秋の別称）が次第に深まる。落葉は風の中いたずらに驚き舞い、天は高く澄んでその果ても見えない。詩人は鷹・葉・高き天によって、処暑の暑から秋へと移る清曠と寂寥を描く。',
      },
    ],
    en: [
      {
        title: 'Phenology',
        body: 'The three pentads of the End of Heat: "first, the hawk makes offering of birds (鹰乃祭鸟); second, heaven and earth grow austere (天地始肃); third, the grain ripens for harvest (禾乃登)." The hawk takes many birds and lays them out as if in offering, an austere air settles over the world, and millet, rice, and other grains ripen for gathering. The word 处 means "to stop": Chushu is "the heat stops here," and the swelter recedes.',
      },
      {
        title: 'Farming',
        body: 'Chushu is the passage into autumn harvest and sowing — "At Chushu the ground turns yellow, and every house mends its granary." The north is busy preparing for harvest; in the south late rice heads and fills and must be guarded against the "cold-dew wind." Drought, flood, and pests still need managing, and the field care of cotton and late rice is especially crucial.',
      },
      {
        title: 'Wellness',
        body: 'With the heat gone and autumn come, days warm and nights cool, Chinese medicine advises guarding against "autumn dryness," protecting the spleen and stomach, and gathering in the yang. Favor clear, moistening foods (white fungus, lotus seed, lily bulb, pear, duck) and ease off the spicy, drying, and greasy. Sleep and rise early, with a modest midday rest to relieve "autumn fatigue." Keep the mood open and calm. As mornings and evenings cool, add clothes and protect the belly, heading off stomach and respiratory trouble.',
      },
      {
        title: 'Poetry',
        body: 'Yuan Zhen\'s "Poems on the Twenty-Four Solar Terms: End of Heat" writes the heat\'s retreat and autumn\'s deepening: "Lately the hawk makes offering of birds; / slowly one feels the autumn (\'white-store\') deepen. / Beneath the leaves, the wind starts them up in vain; / the sky is high, and its heart cannot be seen." The hawk has entered its offering season and the autumn air ("white-store," an old name for fall) grows deep; fallen leaves startle up in the wind to no purpose, and the high, clear sky shows no end. With hawk, leaf, and high heaven the poet paints Chushu\'s clear, vast, lonely turn from summer into autumn.',
      },
    ],
  },
}
