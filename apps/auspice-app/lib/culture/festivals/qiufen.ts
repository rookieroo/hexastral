import type { FestivalContent } from './schema'

/**
 * 秋分 — 节气 (autumn equinox; also 中国农民丰收节). Structure 物候(三候)/农事/养生/诗.
 * 诗: 杜牧《秋夕》(「卧看牵牛织女星」). CJK literal, en explained (ADR-0020).
 */
export const QIUFEN: FestivalContent = {
  id: 'jieqi-qiufen',
  kind: 'jieqi',
  name: {
    'zh-Hans': '秋分',
    'zh-Hant': '秋分',
    ja: '秋分',
    en: 'Qiufen (Autumn Equinox)',
  },
  tagline: {
    'zh-Hans': '二十四节气之十六 · 昼夜均分，秋色平分',
    'zh-Hant': '二十四節氣之十六 · 晝夜均分，秋色平分',
    ja: '二十四節気の第十六 · 昼夜が再び等しく',
    en: 'The 16th solar term · day and night in balance again',
  },
  sections: {
    'zh-Hans': [
      {
        title: '物候',
        body: '秋分三候——「一候雷始收声，二候蛰虫坯户，三候水始涸」。阳气渐衰，雷声止息；蛰虫培土封堵巢穴以备冬眠（「坯户」）；天气干燥，水气减少而沼泽渐涸。秋分昼夜再次均分，自此昼渐短、夜渐长，阴气始盛。',
      },
      {
        title: '农事',
        body: '秋分是「三秋」（秋收、秋耕、秋种）大忙时节，农谚「白露早，寒露迟，秋分种麦正当时」。北方抢收玉米、大豆并适期播种冬小麦，南方晚稻灌浆、棉花采摘。2018 年起，秋分被定为「中国农民丰收节」。',
      },
      {
        title: '养生',
        body: '秋分阴阳相半，中医主张「阴阳平衡、平补润燥」。饮食宜甘润平和（山药、莲藕、百合、芝麻、核桃），寒温适中，护肺亦护脾。起居宜早睡早起，添衣防凉。情志宜宁静收敛，悲秋者宜多见阳光、舒展心怀。运动以平缓为宜，避免大汗伤津。',
      },
      {
        title: '诗',
        body: '杜牧《秋夕》写清秋夜色：「银烛秋光冷画屏，轻罗小扇扑流萤。天阶夜色凉如水，卧看牵牛织女星。」——银烛幽光映着清冷画屏，轻罗小扇轻扑流萤。夜色凉如秋水，独卧仰望牵牛织女二星。诗中凉意与孤寂交融，写尽秋分时节清凉如水、长夜寂寥的况味。',
      },
    ],
    'zh-Hant': [
      {
        title: '物候',
        body: '秋分三候——「一候雷始收聲，二候蟄蟲坯戶，三候水始涸」。陽氣漸衰，雷聲止息；蟄蟲培土封堵巢穴以備冬眠（「坯戶」）；天氣乾燥，水氣減少而沼澤漸涸。秋分晝夜再次均分，自此晝漸短、夜漸長，陰氣始盛。',
      },
      {
        title: '農事',
        body: '秋分是「三秋」（秋收、秋耕、秋種）大忙時節，農諺「白露早，寒露遲，秋分種麥正當時」。北方搶收玉米、大豆並適期播種冬小麥，南方晚稻灌漿、棉花採摘。2018 年起，秋分被定為「中國農民豐收節」。',
      },
      {
        title: '養生',
        body: '秋分陰陽相半，中醫主張「陰陽平衡、平補潤燥」。飲食宜甘潤平和（山藥、蓮藕、百合、芝麻、核桃），寒溫適中，護肺亦護脾。起居宜早睡早起，添衣防涼。情志宜寧靜收斂，悲秋者宜多見陽光、舒展心懷。運動以平緩為宜，避免大汗傷津。',
      },
      {
        title: '詩',
        body: '杜牧《秋夕》寫清秋夜色：「銀燭秋光冷畫屏，輕羅小扇撲流螢。天階夜色涼如水，臥看牽牛織女星。」——銀燭幽光映著清冷畫屏，輕羅小扇輕撲流螢。夜色涼如秋水，獨臥仰望牽牛織女二星。詩中涼意與孤寂交融，寫盡秋分時節清涼如水、長夜寂寥的況味。',
      },
    ],
    ja: [
      {
        title: '物候',
        body: '秋分の三候——「一候 雷 始めて声を収む、二候 蟄虫（ちっちゅう）戸を坯（ふさ）ぐ、三候 水 始めて涸（か）る」。陽気が衰え、雷の声がやむ。蟄虫は土を盛って巣の口を塞ぎ冬眠に備える。天気は乾き、水気が減って沼沢が涸れてゆく。秋分は再び昼夜が等分となり、これより昼は短く夜は長く、陰気が盛んになり始める。',
      },
      {
        title: '農事',
        body: '秋分は「三秋」（秋の収穫・耕し・種まき）の繁忙期で、「白露は早く、寒露は遅く、秋分こそ麦蒔きの正時」と農諺に言う。北方ではトウモロコシ・大豆を急ぎ収め、適期に冬小麦を播く。南方では晩稲が実を充たし、綿を摘む。2018年より秋分は「中国農民豊収節」と定められた。',
      },
      {
        title: '養生',
        body: '秋分は陰陽相半ばし、漢方では「陰陽の平衡、平らかに補い燥を潤す」ことを説く。食は甘く潤い穏やかなもの（山芋・蓮根・百合・胡麻・胡桃）を宜とし、寒温を適度にして肺をも脾をも護る。早寝早起きし、衣を足して涼を防ぐ。情を静め収め、秋に悲しむ者は陽光を多く浴びて心を舒べる。運動は穏やかに、大汗で津を損なわぬようにする。',
      },
      {
        title: '詩',
        body: '杜牧「秋夕」は清らかな秋の夜を詠む：「銀燭の秋光 画屏冷ややかに、軽羅の小扇 流螢を撲（う）つ。天階の夜色 涼しきこと水の如く、臥して看る 牽牛織女の星。」——銀の燭のほのかな光が冷ややかな画屏に映え、薄絹の小扇で飛ぶ蛍をはたく。天の階（きざはし）の夜の色は水のように涼しく、独り臥して牽牛と織女の二星を仰ぐ。涼しさと孤寂が溶け合い、秋分の頃の、水のごとく涼しく長夜寂しい趣を写し尽くす。',
      },
    ],
    en: [
      {
        title: 'Phenology',
        body: 'The three pentads of the Autumn Equinox: "first, the thunder withdraws its voice (雷始收声); second, the hibernating insects seal their burrows (蛰虫坯户); third, the waters begin to dry (水始涸)." The yang wanes and the thunder falls silent; insects mound earth to close their nests for the winter sleep; the air dries and the marshes shrink. At the equinox day and night are again equal; from here the days shorten and the nights lengthen, and the yin begins to gather strength.',
      },
      {
        title: 'Farming',
        body: 'The Autumn Equinox is the busy time of the "three autumns" — harvest, plowing, and sowing. "White Dew too early, Cold Dew too late; the equinox is just right to sow the wheat," runs the proverb. The north races to gather corn and soybean and sows winter wheat in season; the south fills out its late rice and picks cotton. Since 2018 the equinox has also been China\'s "Farmers\' Harvest Festival."',
      },
      {
        title: 'Wellness',
        body: 'With yin and yang in balance, Chinese medicine advises "balancing yin and yang, tonifying gently and moistening dryness." Favor mild, sweet, moistening foods (yam, lotus root, lily bulb, sesame, walnut), neither too cold nor too hot, to protect both lungs and spleen. Sleep and rise early, and add clothes against the chill. Keep the mood quiet and gathered; those who grieve in autumn should seek the sunlight and open the heart. Exercise gently, avoiding heavy sweat that drains the fluids.',
      },
      {
        title: 'Poetry',
        body: 'Du Mu\'s "Autumn Evening" paints the clear autumn night: "Silver candle, autumn light cold on the painted screen; / a light silk fan flicks at the drifting fireflies. / The night on the palace steps is cool as water — / lying back, she watches the Herd-boy and Weaver stars." A silver candle\'s faint light falls on a cold painted screen; a thin silk fan bats at the fireflies. The night is cool as autumn water as she lies and gazes up at the stars of the Cowherd and the Weaver Girl. Coolness and solitude blend, capturing all the water-cool, long-night loneliness of the equinox season.',
      },
    ],
  },
}
