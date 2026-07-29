import type { FestivalContent } from './schema'

/**
 * 小暑 — 节气. Structure 物候(三候)/农事/养生/诗. 诗: 元稹《咏廿四气诗·小暑》
 * (「倏忽温风至，因循小暑来」). CJK literal, en explained (ADR-0020).
 */
export const XIAOSHU: FestivalContent = {
  id: 'jieqi-xiaoshu',
  kind: 'jieqi',
  name: {
    'zh-Hans': '小暑',
    'zh-Hant': '小暑',
    ja: '小暑',
    en: 'Minor Heat (Xiaoshu)',
  },
  tagline: {
    'zh-Hans': '二十四节气之十一 · 温风始至，暑气渐盛',
    'zh-Hant': '二十四節氣之十一 · 溫風始至，暑氣漸盛',
    ja: '二十四節気の第十一 · 暑さが本格化する',
    en: 'The 11th solar term · the warm wind, heat building',
  },
  sections: {
    'zh-Hans': [
      {
        title: '物候',
        body: '小暑三候——「一候温风至，二候蟋蟀居壁，三候鹰始鸷」。热风自此而至，再无凉意；蟋蟀因暑热避居墙壁之下；幼鹰开始学习搏击之技。小暑者，暑气始盛而未极，故曰「小」。',
      },
      {
        title: '农事',
        body: '小暑正值「三夏」扫尾与田管关键期。农谚「小暑大暑，灌死老鼠」言雨量之大。南方早稻收割、晚稻栽插（「双抢」）进入高潮；北方玉米、大豆需中耕培土、防涝抗旱。此时高温多雨，病虫害高发，需加强防治。',
      },
      {
        title: '养生',
        body: '小暑暑湿交蒸，中医主张「少动多静、清心防暑」。饮食宜清淡、多食「清补」（莲子、绿豆、丝瓜、藕），适量酸味敛汗生津，忌过食冰冷。起居宜晚睡早起、午间避暑小憩。情志宜平和，「心静自然凉」，避免大喜大怒。注意防暑降温、补充水分。',
      },
      {
        title: '诗',
        body: '元稹《咏廿四气诗·小暑》写暑气初临：「倏忽温风至，因循小暑来。竹喧先觉雨，山暗已闻雷。」——温热之风倏忽而至，循着时序小暑便来；竹叶喧响先觉骤雨将临，山色暗沉已闻远雷。诗人以风、雨、雷写小暑湿热欲雨之态，节候宛然在目。',
      },
    ],
    'zh-Hant': [
      {
        title: '物候',
        body: '小暑三候——「一候溫風至，二候蟋蟀居壁，三候鷹始鷙」。熱風自此而至，再無涼意；蟋蟀因暑熱避居牆壁之下；幼鷹開始學習搏擊之技。小暑者，暑氣始盛而未極，故曰「小」。',
      },
      {
        title: '農事',
        body: '小暑正值「三夏」掃尾與田管關鍵期。農諺「小暑大暑，灌死老鼠」言雨量之大。南方早稻收割、晚稻栽插（「雙搶」）進入高潮；北方玉米、大豆需中耕培土、防澇抗旱。此時高溫多雨，病蟲害高發，需加強防治。',
      },
      {
        title: '養生',
        body: '小暑暑濕交蒸，中醫主張「少動多靜、清心防暑」。飲食宜清淡、多食「清補」（蓮子、綠豆、絲瓜、藕），適量酸味斂汗生津，忌過食冰冷。起居宜晚睡早起、午間避暑小憩。情志宜平和，「心靜自然涼」，避免大喜大怒。注意防暑降溫、補充水分。',
      },
      {
        title: '詩',
        body: '元稹《詠廿四氣詩·小暑》寫暑氣初臨：「倏忽溫風至，因循小暑來。竹喧先覺雨，山暗已聞雷。」——溫熱之風倏忽而至，循著時序小暑便來；竹葉喧響先覺驟雨將臨，山色暗沉已聞遠雷。詩人以風、雨、雷寫小暑濕熱欲雨之態，節候宛然在目。',
      },
    ],
    ja: [
      {
        title: '物候',
        body: '暑気が盛んになりつつ、まだ最盛期ではない節気。「小」と名づけられるゆえは、暑さがこれからさらに増すからである。\n\n「一候温风至，二候蟋蟀居壁，三候鹰始鸷」\n\n熱い風が吹き始め、涼しさは薄れる。コオロギが壁の陰にこもる。若い鷹が狩りの技を学び始める。湿熱が増し、雷雨の前触れも感じられる。',
      },
      {
        title: '農事',
        body: '小暑は「三夏」の仕上げと田管の正念場にあたる。「小暑大暑、鼠も溺れ死ぬ」と農諺に言うほど雨量が多い。南方では早稲の刈り取りと晩稲の植え付け（「双搶」）が最高潮に達し、北方ではトウモロコシ・大豆の中耕培土、澇（みずびたし）の防止と旱への備えを要する。高温多雨で病虫害も多く、防除を強める。',
      },
      {
        title: '養生',
        body: '小暑は暑と湿が入り混じって蒸す。養生では動を少なく静を多くし、心を清め暑を防ぐ。食事は淡白に、蓮の実・緑豆・糸瓜・蓮根などで清補し、適度な酸味で汗を抑え津を生じ、冷たいものの摂りすぎを避ける。遅寝早起き、昼は暑を避けて小憩する。気持ちを穏やかに保ち、「心静かなれば自ずから涼し」——大きな喜怒は避ける。暑さ対策と水分補給に努める。',
      },
      {
        title: '詩',
        body: '元稹の「咏廿四气诗·小暑」は、風・雨・雷で湿熱の初めを描く。三候の「温风至」に呼応している。\n\n「倏忽温风至，因循小暑来。竹喧先觉雨，山暗已闻雷。」\n\n温かい風がたちまち吹き、時の流れのまま小暑が訪れる。竹の葉がざわめいて夕立を察し、山の色が暗くなると遠雷が聞こえる——湿熱と雨を孕む小暑の気配が目に浮かぶ。',
      },
    ],
    en: [
      {
        title: 'Phenology',
        body: 'The three pentads of Lesser Heat: first, the warm wind arrives; second, the cricket takes to the wall; third, the hawk begins to hunt fiercely. A hot wind blows from here, with no more coolness; crickets shelter under the walls from the heat; and young hawks begin to learn the art of the strike. Xiaoshu — "lesser heat" — names the time when the heat grows strong but has not yet peaked, hence "lesser." Classical three pentads: 「一候温风至，二候蟋蟀居壁，三候鹰始鸷」。',
      },
      {
        title: 'Farming',
        body: 'Lesser Heat is the make-or-break of the "three summers\' " finish and field management. "Lesser Heat, Greater Heat — enough rain to drown the rats," runs the proverb, marking the downpours. In the south the "double rush" — reaping early rice, transplanting late rice — peaks; in the north corn and soybean need cultivation and earthing-up, flood prevention and drought resistance. With high heat and heavy rain, pests and disease run high, and control must intensify.',
      },
      {
        title: 'Wellness',
        body: 'Heat and damp steam together at Lesser Heat, so Chinese medicine advises "move less, rest more; clear the heart and guard against heat." Keep the diet light and eat more "cooling tonics" (lotus seed, mung bean, loofah, lotus root), a little sour to check sweating and generate fluids, and avoid too much that is iced. Sleep late and rise early, with a midday rest out of the heat. Keep the mood even — "calm heart, natural cool" — and avoid great joy or anger. Mind heat protection and replenish water.',
      },
      {
        title: 'Poetry',
        body: 'Yuan Zhen\'s "Poems on the Twenty-Four Solar Terms: Lesser Heat" writes the heat\'s first arrival: "All at once the warm wind comes; / following its course, Lesser Heat arrives. / The bamboo rustles — first sign of rain; / the hills darken — already thunder is heard." The warm wind springs up in an instant, and Lesser Heat comes in season\'s turn; the rustling bamboo senses the coming shower, the darkening hills already carry distant thunder. With wind, rain, and thunder the poet paints Lesser Heat\'s damp, rain-laden air — the season vivid before the eyes.',
      },
    ],
  },
}
