import type { FestivalContent } from './schema'

/**
 * 春分 — 节气. Structure 物候(三候)/农事/养生/诗. 诗: 徐铉《春分日》
 * (「仲春初四日，春色正中分」). CJK literal, en explained (ADR-0020).
 */
export const CHUNFEN: FestivalContent = {
  id: 'jieqi-chunfen',
  kind: 'jieqi',
  name: {
    'zh-Hans': '春分',
    'zh-Hant': '春分',
    ja: '春分',
    en: 'Chunfen (Spring Equinox)',
  },
  tagline: {
    'zh-Hans': '二十四节气之四 · 昼夜均分，阴阳相半',
    'zh-Hant': '二十四節氣之四 · 晝夜均分，陰陽相半',
    ja: '二十四節気の第四 · 昼夜が等しく分かれる',
    en: 'The 4th solar term · day and night in balance',
  },
  sections: {
    'zh-Hans': [
      {
        title: '物候',
        body: '春分三候——「一候玄鸟至，二候雷乃发声，三候始电」。燕子（玄鸟）自南归来，天际始有雷声，继而见电。春分昼夜均、寒暑平，阴阳相半，自此昼渐长、夜渐短，是观候天象的重要节点。',
      },
      {
        title: '农事',
        body: '春分是春管春种的大忙时节，农谚云「春分麦起身，一刻值千金」。北方冬小麦拔节，需肥水管理；南方早稻插秧、棉花备播。「春分有雨家家忙」，此时降水与回暖并至，田间播种、移栽全面铺开。',
      },
      {
        title: '养生',
        body: '春分讲究「阴阳平衡」，养生重在调和、不偏不倚。饮食宜寒温相济（韭菜、春笋配百合、菠菜），少食大寒大热之物，可疏肝理气以保情志平和。起居顺应昼长，适度运动以助阳气升发，早晚温差仍大，宜「春捂」防寒。',
      },
      {
        title: '诗',
        body: '徐铉《春分日》写昼夜平分之景：「仲春初四日，春色正中分。绿野徘徊月，晴天断续云。」——春分恰在仲春之中，春色平分昼夜。绿野之上月色徘徊，晴空中流云断续，一派澄明和煦的仲春气象，正合「春分」阴阳相半之意。',
      },
    ],
    'zh-Hant': [
      {
        title: '物候',
        body: '春分三候——「一候玄鳥至，二候雷乃發聲，三候始電」。燕子（玄鳥）自南歸來，天際始有雷聲，繼而見電。春分晝夜均、寒暑平，陰陽相半，自此晝漸長、夜漸短，是觀候天象的重要節點。',
      },
      {
        title: '農事',
        body: '春分是春管春種的大忙時節，農諺云「春分麥起身，一刻值千金」。北方冬小麥拔節，需肥水管理；南方早稻插秧、棉花備播。「春分有雨家家忙」，此時降水與回暖並至，田間播種、移栽全面鋪開。',
      },
      {
        title: '養生',
        body: '春分講究「陰陽平衡」，養生重在調和、不偏不倚。飲食宜寒溫相濟（韭菜、春筍配百合、菠菜），少食大寒大熱之物，可疏肝理氣以保情志平和。起居順應晝長，適度運動以助陽氣升發，早晚溫差仍大，宜「春捂」防寒。',
      },
      {
        title: '詩',
        body: '徐鉉《春分日》寫晝夜平分之景：「仲春初四日，春色正中分。綠野徘徊月，晴天斷續雲。」——春分恰在仲春之中，春色平分晝夜。綠野之上月色徘徊，晴空中流雲斷續，一派澄明和煦的仲春氣象，正合「春分」陰陽相半之意。',
      },
    ],
    ja: [
      {
        title: '物候',
        body: '春分の三候——「一候 玄鳥至る、二候 雷乃ち声を発す、三候 始めて電（いなびかり）す」。燕（玄鳥）が南から帰り、天に雷の声が始まり、やがて稲妻が見える。春分は昼夜が等しく、寒暑も平らかで陰陽相半ばする。これより昼は長く夜は短くなる、天象を観るうえで大切な節目である。',
      },
      {
        title: '農事',
        body: '春分は春の管理と種まきの繁忙期で、「春分に麦立ち上がる、一刻 千金に値す」と農諺に言う。北方では冬小麦が節を伸ばし、肥と水の管理を要する。南方では早稲の田植え、綿の播種の備えに入る。「春分に雨あれば家ごとに忙し」、降水と暖気が共に至り、田の播種・移植が一斉に広がる。',
      },
      {
        title: '養生',
        body: '春分は「陰陽の平衡」を重んじ、養生も偏らぬ調和を旨とする。食は寒温を相和し（韮や筍に百合・ほうれん草を合わせ）、大寒・大熱のものを控え、肝を疏らかにして情を穏やかに保つ。起居は昼の長さに順い、適度に動いて陽気の伸びを助ける。朝晩の寒暖差はなお大きく、「春の着込み」で寒を防ぐとよい。',
      },
      {
        title: '詩',
        body: '徐鉉「春分の日」は昼夜の等分を詠む：「仲春 初四の日、春色 正に中分す。緑野 月に徘徊し、晴天 雲断続す。」——春分はちょうど仲春のただ中、春の色が昼夜を分け合う。緑の野に月影がたゆたい、晴れた空に雲が切れぎれに流れる。澄んで和やかな仲春の気象が、「春分」の陰陽相半ばする意にかなっている。',
      },
    ],
    en: [
      {
        title: 'Phenology',
        body: 'The three pentads of the Spring Equinox: "first, the swallow arrives (玄鸟至); second, thunder gives voice (雷乃发声); third, lightning first appears (始电)." Swallows return from the south, thunder sounds in the sky, and lightning follows. At the equinox day and night are equal, heat and cold are level, yin and yang in balance; from here the days lengthen and the nights shorten — a key moment for reading the signs of the heavens.',
      },
      {
        title: 'Farming',
        body: 'The Spring Equinox is a busy time of tending and sowing — "At the equinox the wheat stands up; a single moment is worth gold," runs the proverb. In the north winter wheat is jointing and needs water and fertilizer; in the south early rice is transplanted and cotton readied. "Rain at the equinox, and every house is busy" — rain and warmth arrive together, and field sowing and transplanting spread out in full.',
      },
      {
        title: 'Wellness',
        body: 'The Spring Equinox prizes "the balance of yin and yang," and its wellness lies in harmony, leaning to neither side. Pair cool and warm foods (chives and spring bamboo shoots with lily bulb and spinach); avoid the very cold or very hot; soothe the liver and regulate the qi to keep the mood even. Live in step with the lengthening day and move in moderation to help the yang rise; with the morning-and-evening swings still wide, "spring layering" guards against the cold.',
      },
      {
        title: 'Poetry',
        body: 'Xu Xuan\'s "On the Day of the Spring Equinox" paints the equal division of day and night: "The fourth day of mid-spring — / the colors of spring are split right down the middle. / Over green fields the moon lingers; / in the clear sky clouds drift, breaking and joining." The equinox falls at the very center of spring, the season\'s light shared evenly between day and night. The moonlight wandering over green fields, the broken clouds in a clear sky — a bright, mild mid-spring scene, true to the balance of yin and yang the term names.',
      },
    ],
  },
}
