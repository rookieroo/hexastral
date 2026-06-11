import type { FestivalContent } from './schema'

/**
 * 立冬 — 节气 (start of winter). Structure 物候(三候)/农事/养生/诗. 诗: 仇远
 * 《立冬即事》(「何处梅花一缕香」). CJK literal, en explained (ADR-0020).
 */
export const LIDONG: FestivalContent = {
  id: 'jieqi-lidong',
  kind: 'jieqi',
  name: {
    'zh-Hans': '立冬',
    'zh-Hant': '立冬',
    ja: '立冬',
    en: 'Lidong (Start of Winter)',
  },
  tagline: {
    'zh-Hans': '二十四节气之十九 · 万物收藏，避寒就温',
    'zh-Hant': '二十四節氣之十九 · 萬物收藏，避寒就溫',
    ja: '二十四節気の第十九 · 冬の始まり',
    en: 'The 19th solar term · winter begins, all things store away',
  },
  sections: {
    'zh-Hans': [
      {
        title: '物候',
        body: '立冬三候——「一候水始冰，二候地始冻，三候雉入大水为蜃」。水面始结薄冰，土地渐冻，野鸡（雉）等大鸟少见，海边大蛤（蜃）增多，古人遂有「雉化为蜃」之想象。立冬者，冬之始，万物收藏，避寒就温。',
      },
      {
        title: '农事',
        body: '立冬是秋收冬藏的收尾节点，「立冬不使牛」，大田农事渐歇。北方完成冬小麦冬灌、积肥造肥，储菜入窖；南方抢种晚茬作物、油菜培管。农谚「立冬种豌豆，一斗还一斗」，提示因地抢种。畜舍亦需保暖防寒。',
      },
      {
        title: '养生',
        body: '立冬阳气潜藏，中医主张「养藏」，重在敛阳护肾、温补防寒。饮食宜温补（羊肉、牛肉、栗子、核桃、黑芝麻），少食生冷；北方多进补，南方宜清补。起居宜早睡晚起、「必待日光」，避寒就温，护好头颈与足。情志宜安宁内敛，恬淡少扰。',
      },
      {
        title: '诗',
        body: '仇远《立冬即事》写初冬清寂：「细雨生寒未有霜，庭前木叶半青黄。小春此去无多日，何处梅花一缕香。」——细雨微寒尚未成霜，庭前树叶半青半黄。小阳春的暖意已所剩无几，不知何处的梅花已飘来一缕清香。诗人于立冬时节，于萧瑟中捕捉到一线早梅的生机与暗香。',
      },
    ],
    'zh-Hant': [
      {
        title: '物候',
        body: '立冬三候——「一候水始冰，二候地始凍，三候雉入大水為蜃」。水面始結薄冰，土地漸凍，野雞（雉）等大鳥少見，海邊大蛤（蜃）增多，古人遂有「雉化為蜃」之想像。立冬者，冬之始，萬物收藏，避寒就溫。',
      },
      {
        title: '農事',
        body: '立冬是秋收冬藏的收尾節點，「立冬不使牛」，大田農事漸歇。北方完成冬小麥冬灌、積肥造肥，儲菜入窖；南方搶種晚茬作物、油菜培管。農諺「立冬種豌豆，一斗還一斗」，提示因地搶種。畜舍亦需保暖防寒。',
      },
      {
        title: '養生',
        body: '立冬陽氣潛藏，中醫主張「養藏」，重在斂陽護腎、溫補防寒。飲食宜溫補（羊肉、牛肉、栗子、核桃、黑芝麻），少食生冷；北方多進補，南方宜清補。起居宜早睡晚起、「必待日光」，避寒就溫，護好頭頸與足。情志宜安寧內斂，恬淡少擾。',
      },
      {
        title: '詩',
        body: '仇遠《立冬即事》寫初冬清寂：「細雨生寒未有霜，庭前木葉半青黃。小春此去無多日，何處梅花一縷香。」——細雨微寒尚未成霜，庭前樹葉半青半黃。小陽春的暖意已所剩無幾，不知何處的梅花已飄來一縷清香。詩人於立冬時節，於蕭瑟中捕捉到一線早梅的生機與暗香。',
      },
    ],
    ja: [
      {
        title: '物候',
        body: '立冬の三候——「一候 水 始めて氷る、二候 地 始めて凍る、三候 雉 大水に入りて蜃（しん）と為る」。水面に薄氷が張り始め、地は次第に凍り、野鶏（雉）など大きな鳥が見えなくなり、海辺に大蛤（蜃）が増えるゆえ、古人は「雉 蜃と化す」と想った。立冬とは冬の始まりで、万物が収まり蔵（かく）れ、寒を避けて温に就く。',
      },
      {
        title: '農事',
        body: '立冬は秋収冬蔵の締めくくりで、「立冬に牛を使わず」と言い、大田の農事は次第に休む。北方では冬小麦の冬の灌水を終え、肥を積み、野菜を蔵に納める。南方では晩茬（おそまき）の作物を急ぎ植え、菜種を培い管理する。「立冬に豌豆を種えば、一斗が一斗を還す」と農諺に言う。畜舎も保温・防寒を要する。',
      },
      {
        title: '養生',
        body: '立冬は陽気が潜み蔵れる。漢方では「蔵を養う」とし、陽を収め腎を護り、温かく補って寒を防ぐことを重んじる。食は温補のもの（羊肉・牛肉・栗・胡桃・黒胡麻）を宜とし、生冷を控える。北方は進補を多く、南方は清補を宜とする。早寝遅起きし、「必ず日光を待ち」、寒を避けて温に就き、頭・首・足を護る。情を安らかに内に収め、恬淡として乱さない。',
      },
      {
        title: '詩',
        body: '仇遠「立冬即事」は初冬の清寂を詠む：「細雨 寒を生じて未だ霜あらず、庭前の木葉 半ば青く半ば黄なり。小春 此に去りて多日なし、何れの処の梅花か 一縷の香。」——細雨が微かな寒さを生むがまだ霜にはならず、庭先の木の葉は半ば青く半ば黄ばむ。小春日和の暖もはやいくばくもなく、どこからか早梅の一筋の香が漂ってくる。詩人は立冬の蕭条のなかに、早梅の生気と仄かな香りを捉える。',
      },
    ],
    en: [
      {
        title: 'Phenology',
        body: 'The three pentads of the Start of Winter: "first, the waters begin to freeze (水始冰); second, the earth begins to freeze (地始冻); third, the pheasant enters the water and becomes a clam (雉入大水为蜃)." Thin ice forms on the water, the ground begins to freeze, and as large birds like pheasants grow scarce and great clams ("蜃") multiply along the shore, the ancients imagined the pheasant turning into a clam. Lidong is winter\'s beginning: all things gather and store themselves away, shunning cold for warmth.',
      },
      {
        title: 'Farming',
        body: 'Lidong closes out the autumn harvest and winter storage — "At Lidong, don\'t work the ox," and the field labor winds down. The north finishes the winter-wheat irrigation, builds up manure, and stores vegetables in cellars; the south hurries in late crops and tends rapeseed. "Plant peas at Lidong and a peck returns a peck," runs the proverb. The animal sheds, too, must be kept warm.',
      },
      {
        title: 'Wellness',
        body: 'At Lidong the yang hides away, so Chinese medicine advises "nourishing the storing," above all gathering in the yang and protecting the kidneys, warming and tonifying against the cold. Favor warming, tonifying foods (mutton, beef, chestnut, walnut, black sesame) and ease off the cold and raw; the north tonifies heartily, the south more gently. Sleep early and rise late — "wait for the daylight" — shun cold for warmth, and protect the head, neck, and feet. Keep the mood settled and inward, plain and undisturbed.',
      },
      {
        title: 'Poetry',
        body: 'Qiu Yuan\'s "On the Start of Winter" catches early winter\'s quiet: "A fine rain brings cold, but no frost yet; / before the courtyard the leaves are half green, half gold. / The little spring has not many days left to go — / yet from somewhere, a thread of plum-blossom scent." A drizzle brings a faint chill not yet frost; the leaves are half green and half yellow; the warmth of the "little spring" is nearly spent, and from somewhere an early plum already drifts its fragrance. In the bleakness of Lidong the poet catches a single thread of the early plum\'s life and hidden scent.',
      },
    ],
  },
}
