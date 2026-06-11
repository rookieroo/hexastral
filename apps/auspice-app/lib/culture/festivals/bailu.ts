import type { FestivalContent } from './schema'

/**
 * 白露 — 节气. Structure 物候(三候)/农事/养生/诗. 诗: 《诗经·秦风·蒹葭》
 * (「蒹葭苍苍，白露为霜」). CJK literal, en explained (ADR-0020).
 */
export const BAILU: FestivalContent = {
  id: 'jieqi-bailu',
  kind: 'jieqi',
  name: {
    'zh-Hans': '白露',
    'zh-Hant': '白露',
    ja: '白露',
    en: 'Bailu (White Dew)',
  },
  tagline: {
    'zh-Hans': '二十四节气之十五 · 露凝而白，秋意渐浓',
    'zh-Hant': '二十四節氣之十五 · 露凝而白，秋意漸濃',
    ja: '二十四節気の第十五 · 露が白く凝る頃',
    en: 'The 15th solar term · the dew condenses white',
  },
  sections: {
    'zh-Hans': [
      {
        title: '物候',
        body: '白露三候——「一候鸿雁来，二候玄鸟归，三候群鸟养羞」。鸿雁自北南飞，燕子（玄鸟）也南归避寒，百鸟感秋而储食备冬（「养羞」即储藏食物）。白露者，阴气渐重，露凝而白，是昼夜温差最大的节气之一。',
      },
      {
        title: '农事',
        body: '白露是秋收秋管的繁忙时节，「白露白迷迷，秋分稻秀齐」。北方收获谷子、大豆，播种冬小麦；南方晚稻抽穗扬花，需防「白露水」低温阴雨。农谚「白露割谷子，霜降摘柿子」，秋收次第展开，需抢晴抢收。',
      },
      {
        title: '养生',
        body: '白露昼夜温差大、秋燥渐显，中医主张润燥养肺、护阳防凉。饮食宜润肺生津（梨、百合、银耳、蜂蜜、龙眼），少食生冷。「白露身不露」——起居宜适时添衣，尤护脚部与腹部，谨防着凉感冒。情志宜平和，可登高、赏菊以舒怀。民间有「白露茶」「白露酒」之俗。',
      },
      {
        title: '诗',
        body: '《诗经·秦风·蒹葭》是写白露的千古名篇：「蒹葭苍苍，白露为霜。所谓伊人，在水一方。」——苍苍芦苇之上，白露凝结为霜；那思慕的伊人，正在水的另一方。诗以白露清秋起兴，写尽可望难即、求之不得的怅惘，是中国诗歌「朦胧之美」的源头。',
      },
    ],
    'zh-Hant': [
      {
        title: '物候',
        body: '白露三候——「一候鴻雁來，二候玄鳥歸，三候群鳥養羞」。鴻雁自北南飛，燕子（玄鳥）也南歸避寒，百鳥感秋而儲食備冬（「養羞」即儲藏食物）。白露者，陰氣漸重，露凝而白，是晝夜溫差最大的節氣之一。',
      },
      {
        title: '農事',
        body: '白露是秋收秋管的繁忙時節，「白露白迷迷，秋分稻秀齊」。北方收穫穀子、大豆，播種冬小麥；南方晚稻抽穗揚花，需防「白露水」低溫陰雨。農諺「白露割穀子，霜降摘柿子」，秋收次第展開，需搶晴搶收。',
      },
      {
        title: '養生',
        body: '白露晝夜溫差大、秋燥漸顯，中醫主張潤燥養肺、護陽防涼。飲食宜潤肺生津（梨、百合、銀耳、蜂蜜、龍眼），少食生冷。「白露身不露」——起居宜適時添衣，尤護腳部與腹部，謹防著涼感冒。情志宜平和，可登高、賞菊以舒懷。民間有「白露茶」「白露酒」之俗。',
      },
      {
        title: '詩',
        body: '《詩經·秦風·蒹葭》是寫白露的千古名篇：「蒹葭蒼蒼，白露為霜。所謂伊人，在水一方。」——蒼蒼蘆葦之上，白露凝結為霜；那思慕的伊人，正在水的另一方。詩以白露清秋起興，寫盡可望難即、求之不得的悵惘，是中國詩歌「朦朧之美」的源頭。',
      },
    ],
    ja: [
      {
        title: '物候',
        body: '白露の三候——「一候 鴻雁来たる、二候 玄鳥帰る、三候 群鳥 羞（しゅう）を養う」。鴻雁が北から南へ飛び、燕（玄鳥）も寒を避けて南へ帰り、百鳥が秋を感じて食を蓄え冬に備える（「養羞」は食を貯えるの意）。白露とは、陰気が次第に重くなり、露が凝って白く見える頃で、昼夜の寒暖差が最も大きい節気の一つである。',
      },
      {
        title: '農事',
        body: '白露は秋の収穫と管理の繁忙期で、「白露 白く迷迷たり、秋分 稲 秀（ひい）でて斉（そろ）う」と言う。北方では穀子（あわ）や大豆を収め、冬小麦を播く。南方では晩稲が穂を出して花を咲かせ、「白露水」の低温長雨を防ぐ。「白露に穀を刈り、霜降に柿を摘む」と農諺に言い、秋収が次々に展開し、晴れ間を逃さず取り入れる。',
      },
      {
        title: '養生',
        body: '白露は昼夜の寒暖差が大きく、秋の燥が次第に現れる。漢方では燥を潤し肺を養い、陽を護り涼を防ぐことを説く。食は肺を潤し津を生じるもの（梨・百合・白きくらげ・蜂蜜・龍眼）を宜とし、生冷を控える。「白露 身を露わにせず」——時に応じて衣を足し、とりわけ足と腹を護って、冷えと風邪を防ぐ。情を穏やかに保ち、高きに登り菊を愛でて心を舒（の）べる。民間には「白露茶」「白露酒」の風習がある。',
      },
      {
        title: '詩',
        body: '『詩経・秦風・蒹葭』は白露を詠む千古の名篇：「蒹葭（けんか）蒼蒼たり、白露 霜と為る。所謂（いわゆる）伊人、水の一方に在り。」——青々と茂る蘆（あし）の上、白露が凝って霜となる。あの慕わしき人は、水の彼方にいる。詩は白露の清秋に興を起こし、望めども近づきがたく、求めても得られぬ怅（うら）みを写し尽くす。中国詩の「朦朧の美」の源である。',
      },
    ],
    en: [
      {
        title: 'Phenology',
        body: 'The three pentads of White Dew: "first, the wild geese come (鸿雁来); second, the swallows return (玄鸟归); third, the flocks store their food (群鸟养羞)." The geese fly south from the north, the swallows too head south from the cold, and the birds, feeling autumn, lay in food for winter ("storing provisions"). White Dew is when the yin grows heavy and dew condenses white — one of the terms of greatest day-to-night temperature swing.',
      },
      {
        title: 'Farming',
        body: 'White Dew is a busy time of autumn harvest and management — "White Dew, all a misty white; by the equinox the rice stands even." The north gathers millet and soybean and sows winter wheat; in the south late rice heads and flowers and must be guarded against the cold, overcast "White Dew rains." "Cut the millet at White Dew, pick the persimmons at Frost\'s Descent," runs the proverb: the harvest unfolds in turn, and clear days must be seized.',
      },
      {
        title: 'Wellness',
        body: 'With wide day-night swings and rising autumn dryness, Chinese medicine advises moistening dryness and nourishing the lungs, protecting the yang against the chill. Favor lung-moistening, fluid-generating foods (pear, lily bulb, white fungus, honey, longan) and ease off the cold and raw. "At White Dew, don\'t bare the body" — add clothes in good time, protecting the feet and belly especially against catching cold. Keep the mood even; climb to a height or enjoy the chrysanthemums to ease the heart. Folk customs include "White Dew tea" and "White Dew wine."',
      },
      {
        title: 'Poetry',
        body: '"Reeds" from the Book of Songs (Airs of Qin) is the timeless poem of White Dew: "The reeds grow green and dense; / the white dew turns to frost. / The one I think of / is somewhere by the water\'s far side." Above the dense grey-green reeds, white dew freezes into frost; the longed-for one stands on the water\'s other shore. Opening from the clear autumn of White Dew, the poem captures all the ache of what can be glimpsed but not reached — the fountainhead of the "veiled beauty" of Chinese poetry.',
      },
    ],
  },
}
