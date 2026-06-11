import type { FestivalContent } from './schema'

/**
 * 干支 — product-mechanics explainer (kind: 'topic'). The alphabet behind every
 * 干支日 (黄历), 年干支, and 大运/流年 pillar (timeline). Structure 天干/地支/五行/
 * 六十甲子. Reached from the glossary 干支 section + contextual links.
 */
export const TOPIC_GANZHI: FestivalContent = {
  id: 'topic-ganzhi',
  kind: 'topic',
  name: {
    'zh-Hans': '干支',
    'zh-Hant': '干支',
    ja: '干支',
    en: 'Ganzhi (Stems & Branches)',
  },
  tagline: {
    'zh-Hans': '十天干 · 十二地支 · 六十甲子',
    'zh-Hant': '十天干 · 十二地支 · 六十甲子',
    ja: '十干 · 十二支 · 六十干支',
    en: 'Ten Stems · Twelve Branches · the Sixty-Cycle',
  },
  sections: {
    'zh-Hans': [
      {
        title: '天干',
        body: '天干共十：甲、乙、丙、丁、戊、己、庚、辛、壬、癸。它们两两配属五行、分阴阳：甲乙属木、丙丁属火、戊己属土、庚辛属金、壬癸属水；单数（甲丙戊庚壬）为阳，双数（乙丁己辛癸）为阴。天干主「天时」，在八字中代表显露于外的性情与际遇，也是十神关系推演的根基。',
      },
      {
        title: '地支',
        body: '地支共十二：子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥。它们对应十二生肖（子鼠、丑牛、寅虎……）、十二时辰（子时 23–1 点……）与十二月令。地支主「地利」，藏有「人元」（地支藏干），故较天干更复杂深沉。地支之间有六冲、六合、三合、相刑等关系，是论命中吉凶动静的关键。',
      },
      {
        title: '五行',
        body: '五行——木、火、土、金、水——是干支与命理的底层语言。其相生为：木生火、火生土、土生金、金生水、水生木；相克为：木克土、土克水、水克火、火克金、金克木。八字论命，本质是看五行的旺衰、生克、平衡：缺什么、旺什么、需要什么来调候，由此推出「用神」。黄历的吉色、吉方，也由五行推得（如木对应青绿、东方）。',
      },
      {
        title: '六十甲子',
        body: '十天干与十二地支依次相配（甲子、乙丑、丙寅……），阳干配阳支、阴干配阴支，循环一周共得六十组，称「六十甲子」（或六十花甲）。它既用于纪年（如丙午年），也用于纪月、纪日、纪时——黄历每天的「干支日」、本 App 时间轴上的大运/流年，都是这套六十甲子在不同时间维度上的投影。六十年一轮回，故称「一甲子」。',
      },
    ],
    'zh-Hant': [
      {
        title: '天干',
        body: '天干共十：甲、乙、丙、丁、戊、己、庚、辛、壬、癸。它們兩兩配屬五行、分陰陽：甲乙屬木、丙丁屬火、戊己屬土、庚辛屬金、壬癸屬水；單數（甲丙戊庚壬）為陽，雙數（乙丁己辛癸）為陰。天干主「天時」，在八字中代表顯露於外的性情與際遇，也是十神關係推演的根基。',
      },
      {
        title: '地支',
        body: '地支共十二：子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥。它們對應十二生肖（子鼠、丑牛、寅虎……）、十二時辰（子時 23–1 點……）與十二月令。地支主「地利」，藏有「人元」（地支藏干），故較天干更複雜深沉。地支之間有六沖、六合、三合、相刑等關係，是論命中吉凶動靜的關鍵。',
      },
      {
        title: '五行',
        body: '五行——木、火、土、金、水——是干支與命理的底層語言。其相生為：木生火、火生土、土生金、金生水、水生木；相剋為：木剋土、土剋水、水剋火、火剋金、金剋木。八字論命，本質是看五行的旺衰、生剋、平衡：缺什麼、旺什麼、需要什麼來調候，由此推出「用神」。黃曆的吉色、吉方，也由五行推得（如木對應青綠、東方）。',
      },
      {
        title: '六十甲子',
        body: '十天干與十二地支依次相配（甲子、乙丑、丙寅……），陽干配陽支、陰干配陰支，循環一周共得六十組，稱「六十甲子」（或六十花甲）。它既用於紀年（如丙午年），也用於紀月、紀日、紀時——黃曆每天的「干支日」、本 App 時間軸上的大運/流年，都是這套六十甲子在不同時間維度上的投影。六十年一輪迴，故稱「一甲子」。',
      },
    ],
    ja: [
      {
        title: '天干',
        body: '天干は十——甲・乙・丙・丁・戊・己・庚・辛・壬・癸。二つずつ五行に配され、陰陽に分かれる：甲乙は木、丙丁は火、戊己は土、庚辛は金、壬癸は水。奇数（甲丙戊庚壬）が陽、偶数（乙丁己辛癸）が陰。天干は「天の時」を司り、八字では外に現れる性情や巡り合わせを表し、十神（じっしん）関係を推す根幹でもある。',
      },
      {
        title: '地支',
        body: '地支は十二——子・丑・寅・卯・辰・巳・午・未・申・酉・戌・亥。十二支（子＝鼠、丑＝牛、寅＝虎……）、十二時辰（子の刻は 23〜1 時……）、十二の月に対応する。地支は「地の利」を司り、内に「蔵干（ぞうかん）」を蔵すゆえ、天干よりも複雑で奥深い。地支どうしには六冲・六合・三合・相刑などの関係があり、運勢の吉凶や動静を読む鍵となる。',
      },
      {
        title: '五行',
        body: '五行——木・火・土・金・水——は干支と命理の根底をなす言語である。相生は、木は火を生じ、火は土を生じ、土は金を生じ、金は水を生じ、水は木を生ず。相剋は、木は土を剋し、土は水を剋し、水は火を剋し、火は金を剋し、金は木を剋す。八字とは本来、五行の旺衰・生剋・平衡を観るもの——何が欠け、何が旺んで、何をもって調えるかを見て「用神」を導く。黄暦の吉色・吉方もまた五行から得る（木は青緑・東方に対応するように）。',
      },
      {
        title: '六十甲子',
        body: '十の天干と十二の地支を順に組み合わせ（甲子・乙丑・丙寅……）、陽干は陽支に、陰干は陰支に配し、一巡して六十組となる。これを「六十甲子（六十花甲）」という。年（丙午年など）にも、月・日・時にも用いられる——黄暦の毎日の「干支日」も、本アプリの時間軸上の大運・流年も、この六十甲子を異なる時間の次元に映したものである。六十年で一巡するゆえ「一甲子」という。',
      },
    ],
    en: [
      {
        title: 'Heavenly Stems',
        body: 'There are ten Heavenly Stems: 甲 乙 丙 丁 戊 己 庚 辛 壬 癸. In pairs they map to the Five Elements and split into yin and yang: 甲乙 are Wood, 丙丁 Fire, 戊己 Earth, 庚辛 Metal, 壬癸 Water; the odd ones (甲丙戊庚壬) are yang, the even (乙丁己辛癸) yin. The stems govern "the timing of heaven," standing in a chart for the outwardly visible temperament and circumstances — and they are the basis from which the Ten Gods (十神) relationships are read.',
      },
      {
        title: 'Earthly Branches',
        body: 'There are twelve Earthly Branches: 子 丑 寅 卯 辰 巳 午 未 申 酉 戌 亥. They map to the twelve zodiac animals (子 rat, 丑 ox, 寅 tiger…), the twelve double-hours (the 子 hour is 23:00–01:00…), and the twelve months. The branches govern "the advantage of earth" and hide "concealed stems" within them, so they are subtler and deeper than the stems. Among the branches run relations of clash (冲), union (合), trine (三合), and punishment (刑) — the keys to reading fortune\'s rise, fall, and motion.',
      },
      {
        title: 'Five Elements',
        body: 'The Five Elements — Wood, Fire, Earth, Metal, Water — are the underlying language of the stems, the branches, and the whole art. They generate in a cycle: Wood feeds Fire, Fire makes Earth, Earth bears Metal, Metal carries Water, Water grows Wood; and they overcome in another: Wood breaks Earth, Earth dams Water, Water quenches Fire, Fire melts Metal, Metal cuts Wood. Reading a chart is, at heart, reading the strength, generation, and balance of these five — what is lacking, what is strong, and what is needed to bring it to center, from which the "favorable element" (用神) is found. The almanac\'s lucky color and direction come from the elements too (Wood, for instance, maps to green and the east).',
      },
      {
        title: 'The Sixty-Year Cycle',
        body: 'Pairing the ten stems with the twelve branches in turn (甲子, 乙丑, 丙寅…), yang stem to yang branch and yin to yin, and running one full round yields sixty combinations — the "Sixty Jiazi" (六十花甲). It numbers the years (the 丙午 year, say) and also the months, days, and hours: the almanac\'s daily "ganzhi day," and the 大运/流年 on this app\'s life timeline, are all this same sixty-cycle projected onto different scales of time. It returns to its start every sixty years — hence "one jiazi" stands for a full cycle of a life.',
      },
    ],
  },
}
