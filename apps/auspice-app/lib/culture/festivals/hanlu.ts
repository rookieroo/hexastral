import type { FestivalContent } from './schema'

/**
 * 寒露 — 节气. Structure 物候(三候)/农事/养生/诗. 诗: 元稹《咏廿四气诗·寒露》
 * (「寒露惊秋晚，朝看菊渐黄」). CJK literal, en explained (ADR-0020).
 */
export const HANLU: FestivalContent = {
  id: 'jieqi-hanlu',
  kind: 'jieqi',
  name: {
    'zh-Hans': '寒露',
    'zh-Hant': '寒露',
    ja: '寒露',
    en: 'Hanlu (Cold Dew)',
  },
  tagline: {
    'zh-Hans': '二十四节气之十七 · 露气寒冷，将凝为霜',
    'zh-Hant': '二十四節氣之十七 · 露氣寒冷，將凝為霜',
    ja: '二十四節気の第十七 · 露が冷たく凝る頃',
    en: 'The 17th solar term · the dew turns cold',
  },
  sections: {
    'zh-Hans': [
      {
        title: '物候',
        body: '寒露三候——「一候鸿雁来宾，二候雀入大水为蛤，三候菊有黄华」。最后一批鸿雁南迁为「宾」；深秋雀鸟渐少，海边蛤蜊纹色与雀相似，古人遂有「雀化为蛤」之想象；菊花于此时盛开黄花。寒露者，露气寒冷，将凝为霜，是气候由凉转寒的转折。',
      },
      {
        title: '农事',
        body: '寒露是秋收秋种的关键期，「寒露不摘棉，霜打莫怨天」。北方抢收玉米、收获红薯，播种冬小麦扫尾；南方晚稻成熟收割，需防「寒露风」。农谚「寒露到霜降，种麦莫慌张」，提示因地制宜、抢墒播种。',
      },
      {
        title: '养生',
        body: '寒露天气转寒、燥邪当令，中医主张「滋阴润燥、护阳防寒」。饮食宜润燥养阴（芝麻、核桃、银耳、梨、蜂蜜、糯米），少食辛辣。「寒露脚不露」——起居宜保暖足部、适时添衣，谨防寒邪与心脑血管病。情志宜平和乐观，登高赏菊以畅秋怀。晨练宜推迟、避寒露。',
      },
      {
        title: '诗',
        body: '元稹《咏廿四气诗·寒露》写深秋之景：「寒露惊秋晚，朝看菊渐黄。千家风扫叶，万里雁随阳。」——寒露惊觉秋已深暮，清晨但见菊花渐染金黄。千家门前秋风扫叶，万里长空雁阵随暖南飞。诗人以菊、叶、雁三象，写尽寒露时节的清寒与秋深。',
      },
    ],
    'zh-Hant': [
      {
        title: '物候',
        body: '寒露三候——「一候鴻雁來賓，二候雀入大水為蛤，三候菊有黃華」。最後一批鴻雁南遷為「賓」；深秋雀鳥漸少，海邊蛤蜊紋色與雀相似，古人遂有「雀化為蛤」之想像；菊花於此時盛開黃花。寒露者，露氣寒冷，將凝為霜，是氣候由涼轉寒的轉折。',
      },
      {
        title: '農事',
        body: '寒露是秋收秋種的關鍵期，「寒露不摘棉，霜打莫怨天」。北方搶收玉米、收穫紅薯，播種冬小麥掃尾；南方晚稻成熟收割，需防「寒露風」。農諺「寒露到霜降，種麥莫慌張」，提示因地制宜、搶墒播種。',
      },
      {
        title: '養生',
        body: '寒露天氣轉寒、燥邪當令，中醫主張「滋陰潤燥、護陽防寒」。飲食宜潤燥養陰（芝麻、核桃、銀耳、梨、蜂蜜、糯米），少食辛辣。「寒露腳不露」——起居宜保暖足部、適時添衣，謹防寒邪與心腦血管病。情志宜平和樂觀，登高賞菊以暢秋懷。晨練宜推遲、避寒露。',
      },
      {
        title: '詩',
        body: '元稹《詠廿四氣詩·寒露》寫深秋之景：「寒露驚秋晚，朝看菊漸黃。千家風掃葉，萬里雁隨陽。」——寒露驚覺秋已深暮，清晨但見菊花漸染金黃。千家門前秋風掃葉，萬里長空雁陣隨暖南飛。詩人以菊、葉、雁三象，寫盡寒露時節的清寒與秋深。',
      },
    ],
    ja: [
      {
        title: '物候',
        body: '寒露の三候——「一候 鴻雁 来賓す、二候 雀 大水に入りて蛤（はまぐり）と為る、三候 菊に黄華（こうか）有り」。最後の鴻雁の群れが「賓（客）」として南へ渡り、深秋に雀が減り、海辺の蛤の紋様が雀に似るゆえ古人は「雀 蛤と化す」と想った。菊がこの頃、黄の花を盛んに咲かせる。寒露とは、露の気が寒く、やがて霜と凝る、気候が涼から寒へと移る転換である。',
      },
      {
        title: '農事',
        body: '寒露は秋の収穫と種まきの要で、「寒露に綿を摘まずば、霜に打たれて天を怨むな」と言う。北方ではトウモロコシを急ぎ収め、薩摩芋を掘り、冬小麦の播種を終える。南方では晩稲が熟して刈り取られ、「寒露風」を防ぐ。「寒露より霜降まで、麦蒔きに慌てるな」と農諺に言い、土地に応じ墒を逃さず播く。',
      },
      {
        title: '養生',
        body: '寒露は気候が寒へ転じ、燥邪が時を得る。漢方では「陰を滋し燥を潤し、陽を護り寒を防ぐ」ことを説く。食は燥を潤し陰を養うもの（胡麻・胡桃・白きくらげ・梨・蜂蜜・糯米）を宜とし、辛辣を控える。「寒露 脚を露わにせず」——足を温め、時に応じて衣を足し、寒邪と心脳血管の病を防ぐ。情を穏やかに楽観に保ち、高きに登り菊を愛でて秋の懐を暢（の）べる。朝の運動は遅らせ、寒露を避ける。',
      },
      {
        title: '詩',
        body: '元稹「廿四気を詠ずる詩・寒露」は深秋の景を詠む：「寒露 秋の晩なるに驚き、朝に看る 菊の漸く黄なるを。千家 風 葉を掃き、万里 雁 陽に随う。」——寒露に秋の暮れ深きを驚き、朝には菊が次第に黄に染まるのを見る。千家の門前を秋風が葉を掃き、万里の大空を雁の列が暖を追って南へ飛ぶ。詩人は菊・葉・雁の三象によって、寒露の頃の清らかな寒さと秋の深まりを写し尽くす。',
      },
    ],
    en: [
      {
        title: 'Phenology',
        body: 'The three pentads of Cold Dew: "first, the wild geese come as guests (鸿雁来宾); second, the sparrow enters the water and becomes a clam (雀入大水为蛤); third, the chrysanthemum shows its yellow flowers (菊有黄华)." The last flights of geese migrate south as "guests"; as sparrows thin out in late autumn and the shells along the shore resemble them in marking, the ancients imagined the sparrows turning into clams; and the chrysanthemums open their yellow blooms. Cold Dew is when the dew turns cold and is about to freeze into frost — the turn of the climate from cool to cold.',
      },
      {
        title: 'Farming',
        body: 'Cold Dew is a crucial time of autumn harvest and sowing — "Don\'t pick the cotton by Cold Dew, and don\'t blame heaven when the frost strikes." The north races to gather corn, dig sweet potatoes, and finish sowing winter wheat; in the south late rice ripens for cutting and must be guarded against the "cold-dew wind." "From Cold Dew to Frost\'s Descent, no need to rush the wheat," runs the proverb — sow to suit the land and don\'t miss the soil\'s moisture.',
      },
      {
        title: 'Wellness',
        body: 'As the weather turns cold and dryness takes its season, Chinese medicine advises "enriching yin and moistening dryness, protecting the yang against the cold." Favor yin-nourishing, moistening foods (sesame, walnut, white fungus, pear, honey, glutinous rice) and ease off the spicy. "At Cold Dew, don\'t bare the feet" — keep the feet warm, add clothes in time, and guard against cold and against heart and vascular trouble. Keep the mood even and bright; climb to a height and enjoy the chrysanthemums to ease the autumn heart. Put off the morning exercise to avoid the cold dew.',
      },
      {
        title: 'Poetry',
        body: 'Yuan Zhen\'s "Poems on the Twenty-Four Solar Terms: Cold Dew" paints the deep autumn: "Cold Dew startles me — autumn is late; / at dawn I watch the chrysanthemums slowly yellow. / At a thousand homes the wind sweeps the leaves; / for ten thousand miles the geese follow the warmth." Cold Dew wakes him to how far autumn has gone, and at dawn he watches the chrysanthemums turn gold; the autumn wind sweeps leaves before a thousand doors, and across ten thousand miles the lines of geese follow the warmth south. With chrysanthemum, leaf, and geese the poet captures all the clear chill and deepening autumn of Cold Dew.',
      },
    ],
  },
}
